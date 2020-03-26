# Copyright (c) 2019 Fabio Zadrozny
# Additions Copyright (c) 2020, Espressif Systems (Shanghai) Co. Ltd.
#
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0

import json
import sys
import os
import psutil
from typing import Type
from queue import Queue
from . import schema, base_schema, log
from .tools import get_good_path, Measurement


class CommandProcessor(object):
    """
    This is the class that actually processes commands.

    It's created in the main thread and then control is passed on to the reader thread so that whenever
    something is read the json is handled by this processor.

    The queue it receives in the constructor should be used to talk to the writer thread, where it's expected
    to post protocol messages (which will be converted with 'to_dict()' and will have the 'seq' updated as
    needed).
    """

    def __init__(self, dbg_adapter_inst, write_queue, args):
        self.da = dbg_adapter_inst
        self.write_queue = write_queue  # type: Queue
        self.args = args  # type: tuple
        self._logger = log.new_logger("Debug Adapter(Command Processor)")
        self.evaluated = False
        self.evaluation_cache_exp = ""
        self.evaluation_cache_value = ""

    def __call__(self, protocol_message):
        self._logger.debug('Got json: %s' % (
            json.dumps(protocol_message.to_dict(), indent=4, sort_keys=True),))

        try:
            if protocol_message.type == 'request':
                method_name = 'on_%s_request' % (protocol_message.command,)
                on_request = getattr(self, method_name, None)  # check if we have a method  method_name
                if on_request is not None:
                    on_request(protocol_message)
                else:
                    self._logger.warning('Unhandled: %s not available in CommandProcessor.' % (method_name,))
                self._logger.debug("Processed command: %s\n" % protocol_message.command)
        except Exception as e:
            log.debug_exception(e)

    def is_stopped_check(self):
        """
        Returns
        -------
        bool
            True - target is stopped, False - not
        """
        # https://microsoft.github.io/debug-adapter-protocol/specification#Events_Stopped
        st, rsn = self.da.is_stopped()
        if st:
            stop_response_body = schema.StoppedEventBody(
                reason='pause',
                description='Stopped by pause request',
                threadId=0,
                allThreadsStopped=True)
            stop_response = schema.StoppedEvent(body=stop_response_body)
            self.write_message(stop_response)
            return True
        else:
            return False

    def on_initialize_request(self, request):
        """

        Parameters
        ----------
        request : schema.InitializeRequest

        """
        m = Measurement()
        self.da.adapter_init()
        # response
        response = base_schema.build_response(request)  # type: schema.InitializeResponse
        response.body.supportsConfigurationDoneRequest = True
        response.body.supportsSetVariable = True
        response.body.supportsRestartRequest = True
        response.body.supportTerminateDebuggee = True
        response.body.supportsHitConditionalBreakpoints = True
        response.body.supportsConditionalBreakpoints = True
        self.write_message(response)
        # done event
        self.write_message(schema.InitializedEvent())
        if self.da.is_connection_check_mode():
            self.generate_TerminatedEvent()
        m.stop_n_check(2)

    def on_launch_request(self, request):
        """
        Parameters
        ----------
        request:schema.LaunchRequest
        """
        if self.da.is_connection_check_mode():
            return
        r_args = request.arguments.to_dict()
        self.da.state.no_debug = r_args.get('noDebug')
        try:
            self.da.run(start=(not self.da.state.no_debug))
            success = True
        except Exception as e:
            log.debug_exception(e)
            success = False
        launch_response = base_schema.build_response(request)
        launch_response.success = success
        self.write_message(launch_response)  # acknowledge it

    def on_configurationDone_request(self, request):
        """
        Parameters
        ----------
        request:schema.ConfigurationDoneRequest
        """
        self.da.state.configured_by_client = True
        configuration_done_response = base_schema.build_response(request)
        self.write_message(configuration_done_response)  # acknowledge it
        if self.da.state.no_debug:
            self.da.adapter_stop()
            self.generate_TerminatedEvent(restart=False)

    def generate_TerminatedEvent(self, restart=False):
        """
        Parameters
        ----------
        restart : bool
            asks for restart
        """
        body = schema.TerminatedEventBody(restart=restart)
        event = schema.TerminatedEvent(body=body)
        self.write_message(event)

    def on_restart_request(self, request):
        """
        Parameters
        ----------
        request: schema.RestartRequest
        """
        response = base_schema.build_response(request)
        self.write_message(response)
        for th in self.da.threads:
            id = th.get('id')
            self.generate_ThreadEvent(thread_id=int(id), reason='exited')
        self.da.start()
        self.da.get_threads()
        self.da.threads_analysis(force_upd=True)
        for th in self.da.threads:
            id = th.get('id')
            self.generate_StoppedEvent(reason='pause',
                                       thread_id=int(id),
                                       all_threads_stopped=True,
                                       preserve_focus_hint=True)

    def on_continue_request(self, request):
        """
        Parameters
        ----------
        request : schema.ContinueRequest
        """
        # reading:
        thread_id = request.arguments.threadId
        self.da.resume_exec()
        all = True
        # response:
        kwargs = {'body': schema.ContinueResponseBody(allThreadsContinued=all)}
        continue_response = base_schema.build_response(request, kwargs)
        self.write_message(continue_response)
        # # sending a stop for every thread (cause all_threads_stopped=True sometimes not works)
        # stop_state = self.da.is_stopped()  # bool, reason_str
        # if stop_state[0]:
        #     self.generate_StoppedEvent(reason=stop_state[1],
        #                                thread_id=thread_id,
        #                                all_threads_stopped=all)

    def generate_StoppedEvent(self, reason, thread_id, all_threads_stopped=None, preserve_focus_hint=None):
        """
        Parameters
        ----------
        preserve_focus_hint:bool
        reason : str
            "step","breakpoint", "exception", "pause" or "entry"
        thread_id : int
        all_threads_stopped : bool
        """
        body = schema.StoppedEventBody(reason, description='Stopped with reason: ' + str(reason),
                                       threadId=thread_id, allThreadsStopped=all_threads_stopped,
                                       preserveFocusHint=preserve_focus_hint)
        event = schema.StoppedEvent(body)
        self.write_message(event)

    def generate_ContinuedEvent(self, thread_id, all_threads_continued=None):
        """
        Parameters
        ----------
        thread_id : int
        all_threads_continued : bool
        """
        body = schema.ContinuedEventBody(threadId=thread_id, allThreadsContinued=all_threads_continued)
        event = schema.ContinuedEvent(body)
        self.write_message(event)

    def generate_ThreadEvent(self, thread_id, reason='started'):
        """
        Parameters
        ----------
        thread_id : int
        reason : str
            "started" or "exited"
        """
        body = schema.ThreadEventBody(reason=reason, threadId=thread_id)
        event = schema.ThreadEvent(body=body)
        self.write_message(event)

    def on_threads_request(self, request):
        """
        Have own function, converting adapter threads -> list for a response body

        Parameters
        ----------
        request : schema.ThreadsRequest
        """

        def compose_list_for_body(adapter_threads):
            _thr_list = []
            for th in adapter_threads:
                id_from_gdb = th['id']
                func = str(th['frame']['func']).strip("?")
                if func:
                    name = "id - " + str(id_from_gdb) + ", " \
                                                    "frame -" + th['frame']['func'] + ', ' \
                                                                                      'targetID - ' + th['target-id']
                else:
                    name = "id - " + str(id_from_gdb) + ", " \
                                                    "frame on address: " + th['frame']['addr'] + ', ' \
                                                                                      'targetID - ' + th['target-id']
                thread_obj = schema.Thread(int(id_from_gdb), name)
                _thr_list.append(thread_obj.to_dict())
            return _thr_list

        if self.da.is_connection_check_mode():
            return
        # === working:
        try:
            self.da.get_threads()
            thr_list = compose_list_for_body(self.da.threads)
            success = True  # type: bool
            message = None
            # kwargs = {'body': schema.ThreadsResponseBody(thr_list)}
        except Exception as e:
            thr_list = []
            success = False  # type: bool
            message = log.debug_exception(e)
            kwargs = {'body': None}
            # self.da.get_threads()

        kwargs = {'body': schema.ThreadsResponseBody(thr_list)}
        threads_response = base_schema.build_response(request, kwargs)
        threads_response.success = success
        threads_response.message = message
        self.write_message(threads_response)
        self.da.threads_analysis()
        if self.da.state.threads_are_stopped:
            self.generate_StoppedEvent(reason='breakpoint',
                                       thread_id=int(self.da.threads[0]['id']),
                                       all_threads_stopped=True)
        self.da.state.threads_are_stopped = None

    def on_stackTrace_request(self, request):
        """
        Parameters
        ----------
        request: schema.StackTraceRequest
        """
        # reading:
        thread_id = request.arguments.threadId
        stack = self.da.get_backtrace(thread_id)
        # composing
        stack_frames_list = []  # type: list[schema.StackFrame]
        for frame in stack:
            src = schema.Source(path=get_good_path(frame.get('fullname')))
            try:
                line = int(frame.get('line'))
            except TypeError:
                line = None
            if not str(frame.get('func')).strip('?'):
                name = frame.get('addr')
            else:
                name = frame.get('func')
            sf = schema.StackFrame(id=self.da.frame_id_generate(thread_id, frame['level']),
                                   name=name,
                                   line=line,
                                   column=0,
                                   source=src,
                                   # endLine=None,
                                   # endColumn=None,
                                   # moduleId=None,
                                   # presentationHint=None
                                   )
            stack_frames_list.append(sf.to_dict())  # to_dict because of a json encoding error
        kwargs = {
            'body': schema.StackTraceResponseBody(stackFrames=stack_frames_list, totalFrames=len(stack_frames_list))}
        response = base_schema.build_response(request, kwargs)
        self.write_message(response)

    def on_scopes_request(self, request):
        """
        Parameters
        ----------
        request:schema.ScopesRequest
        """
        frame_id = request.arguments.frameId
        self.da.select_frame(frame_id)
        scopes_for_body = []  # type: list[schema.Scope]
        scopes = self.da.get_scopes()
        for scope in scopes:
            scope_dap_obj = schema.Scope(
                name=scope['name'],
                # variablesReference=len(scope['vals_list']),
                variablesReference=len(scope['vals_list']),
                expensive=False
            )
            scopes_for_body.append(scope_dap_obj.to_dict())
        # building a response:
        kwargs = {'body': schema.ScopesResponseBody(scopes=scopes_for_body)}
        response = base_schema.build_response(request, kwargs)
        self.write_message(response)

    def on_source_request(self, request):
        src_file_path = get_good_path(request.arguments.source.path)
        try:
            with open(src_file_path) as file:
                src = file.read()
        except Exception as e:
            src = "[UNKNOWN SOURCE FILE]\n---------------------"
        response = base_schema.build_response(request, kwargs={
            'body': {'content': src}})  # type: schema.Source
        self.write_message(response)

    def on_setVariable_request(self, request):
        """
        Parameters
        ----------
        request:schema.SetVariableRequest
        """
        # reading:
        name = request.arguments.name
        value = request.arguments.value
        self.da.set_variable(name, value)
        response = base_schema.build_response(request, kwargs={
            'body': {'value': value}})  # type: schema.SetVariableResponse
        self.write_message(response)

    def on_evaluate_request(self, request):
        """
        Parameters
        ----------
        request: schema.EvaluateRequest

        """
        expression = request.arguments.expression
        try:
            frame_id = request.arguments.frameId
        except AttributeError:
            frame_id = None
        self.da.select_frame(frame_id)
        result = self.da.evaluate(expression)  # no symbol and other errors processing
        evaluate_response = base_schema.build_response(request, kwargs={
            'body': {'result': str(result), 'variablesReference': 0}})
        self.write_message(evaluate_response)

    def on_setExpression_request(self, request):
        """
        Parameters
        ----------
        request:schema.SetExpressionRequest
        """
        kwargs = {}
        response = base_schema.build_response(request, kwargs)
        self.write_message(response)

    def on_setDataBreakpoints_request(self, request):
        """
        Parameters
        ----------
        request:schema.SetBreakpointsRequest
            TODO check!!!
        """
        kwargs = {}
        response = base_schema.build_response(request, kwargs)
        self.write_message(response)

    def on_variables_request(self, request):
        """
        Parameters
        ----------
        request:schema.VariablesRequest
        """
        self.evaluated = False
        variables_for_body = []  # type: list[schema.Variable]
        vars = self.da.get_vars(frame_id=self.da.frame_id_selected)
        for v in vars:
            v_size = len(v['value'])
            v_val = v['value']
            v_val_fu = str(v_val)
            # else: # TODO think about variablesReference sizes
            # if v_size > 1:
            # variablesReference = len(v['value'])
            v_dap_obj = schema.Variable(
                name=v['name'],
                value=v_val,
                variablesReference=0
            )
            variables_for_body.append(v_dap_obj.to_dict())
        kwargs = {'body': schema.VariablesResponseBody(variables=variables_for_body)}
        response = base_schema.build_response(request, kwargs)
        self.write_message(response)

    def on_disconnect_request(self, request):
        """
        Parameters
        ----------
        request:schema.DisconnectRequest
        """
        # reading
        r_args = request.arguments.to_dict()
        restart = r_args.get('restart')
        # doing
        disconnect_response = base_schema.build_response(request)
        self.da.adapter_stop()
        self.write_message(disconnect_response)
        if not restart:
            sys.exit()

    def on_pause_request(self, request):
        """
        Parameters
        ----------
        request:schema.PauseRequest
        """
        thread_id = request.arguments.threadId
        pause_response = base_schema.build_response(request)
        self.da.pause()
        self.write_message(pause_response)
        self.generate_StoppedEvent(reason='pause',
                                   thread_id=int(thread_id),
                                   all_threads_stopped=True)

    def generate_BreakpointEvent(self, reason, bp):
        """
        Parameters
        ----------
        reason : str
            The reason for the event.
        bp: schema.Breakpoint
            breakpoint: The breakpoint.
        """
        body = schema.BreakpointEventBody(reason, bp)
        event = schema.BreakpointEvent(body)
        self.write_message(event)

    def on_setBreakpoints_request(self, request):
        """
        Parameters
        ----------
        request: schems.SetBreakpointsRequest
        """
        # TODO add logpoints
        bps = request.arguments.breakpoints  # type: list[dict]
        source = request.arguments.source
        self.da.break_removeall()  # clear old ones
        try:
            for bp in bps:
                src_line = bp.get('line')
                condition = bp.get("condition", '')
                bp.update({'verified': 'true'})
                bp.update({'source': source.to_dict()})
                self.da.break_add(get_good_path(source.path) + ":" + str(src_line),
                                  condition=condition)  # TODO add a condition syntax error processing
            kwargs = {'body': schema.SetBreakpointsResponseBody(bps)}
            success = True
        except Exception as e:
            log.debug_exception(e)
            kwargs = {'body': schema.SetBreakpointsResponseBody([])}
            success = False
        response = base_schema.build_response(request, kwargs)
        response.success = success
        self.write_message(response)

    def on_setExceptionBreakpoints_request(self, request):
        """
        Parameters
        ----------
        request:schema.SetExpressionRequest
        """
        response = base_schema.build_response(request)
        self.write_message(response)

    def on_next_request(self, request):
        """
        Parameters
        ----------
        request:schema.NextRequest
        """
        m = Measurement()
        thread_id = request.arguments.threadId

        response = base_schema.build_response(request)
        result = self.da.step()
        response.success = result
        self.write_message(response)

        if result:
            self.generate_StoppedEvent(reason='step',
                                       thread_id=thread_id,
                                       all_threads_stopped=True)
        m.stop_n_check(0.5, "The step operation took too long")

    def on_stepIn_request(self, request):
        """
        Parameters
        ----------
        request:schema.StepInRequest
        """
        thread_id = request.arguments.threadId

        response = base_schema.build_response(request)
        result = self.da.step_in()
        response.success = result
        self.write_message(response)

        if result:
            self.generate_StoppedEvent(reason='step',
                                       thread_id=thread_id,
                                       all_threads_stopped=True)

    def on_stepOut_request(self, request):
        """
        Parameters
        ----------
        request:schema.StepOutRequest
        """
        thread_id = request.arguments.threadId

        response = base_schema.build_response(request)
        result = self.da.step_out()
        response.success = result
        self.write_message(response)

        if result:
            self.generate_StoppedEvent(reason='step',
                                       thread_id=thread_id,
                                       all_threads_stopped=True)

    def write_message(self, protocol_message):
        """
        Some instance of one of the messages in the debug_adapter.schema.

        Parameters
        ----------
        protocol_message:Type(schema.Response)
        """
        self.write_queue.put(protocol_message)
