import socket
import os
import re
import sys
from testing_tools.class_json import Json
from queue import Queue
import json

SOCKET_BUFFER_SIZE = 1024
SOCKET_TIMEOUT = 30
DAP_HEADER_PATTERN = "Content-Length: [0-9]+[\n\r][\n\r]|\n\r"
ANY = "__ANY__"


class ClientDa:
    """
    If no scenario set after creation the object, execute self.execute_scenario("scenario_name")
    """

    def __init__(self, port=43474, host="localhost", scenario=None, wo_checking=False):
        self.state = {
            "Connected": False,
            "Errors": False,
            "WithoutChecking": wo_checking
        }
        self.__host = host
        self.__port = port
        self.__readed_jsons = Queue()  # content in Jsons (not dict, not bytes!)
        # scenario related
        self._loaded_sc = None  # type: Json
        self._scenario_script_elements = 0  # type: int
        self._scenario_script_cur = 0  # type: int
        # socket
        self.__socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.__socket.settimeout(SOCKET_TIMEOUT)
        if scenario:
            self.execute_scenario(scenario)

    def set_scenario_script_cur(self, int_num):
        if int_num >= self._scenario_script_elements:
            raise ValueError("In script there are only 0..%i record, but you tried to set number %i" % (
                (self._scenario_script_elements - 1), int_num))
        else:
            self._scenario_script_cur = int_num

    def connect(self):
        self.__socket.connect((self.__host, self.__port))
        self.state["Connected"] = True

    def disconnect(self):
        self.send_terminate_rq()
        self.__socket.close()
        self.state["Connected"] = False

    def action(self):
        """
        Handle current scenario_act and increase it by 1

        Returns the last one : bool
        """
        current_action = self.get_script_entry()
        if current_action["type"] == "request":
            self._handle_request(current_action)
        elif current_action["type"] == "event":
            self._handle_event(current_action)
        elif current_action["type"] == "response":
            self._handle_response(current_action)
        else:
            raise AttributeError("Wrong action type!" +
                                 " Scenario: " + str(self._loaded_sc["name"]) +
                                 " Action: " + str(self._scenario_script_cur))

    def _handle_request(self, dap_request):
        """
        Parameters
        ----------
        dap_request : dict or Json

        """

        print("\n === handle_request ===")
        self._write(dap_request)
        print("Sent: " + str(dap_request))

    def _handle_event(self, dap_event):
        """
        Parameters
        ----------
        dap_event : dict or Json

        """
        read = self._read_next()
        expected = dap_event
        print("\n === handle_event ===")
        print("read    : " + str(read))
        print("expected: " + str(expected))
        print("\n")
        if not self._compare(read, expected):
            raise ValueError

    def _handle_response(self, dap_response):
        """
        Parameters
        ----------
        dap_response : dict or Json

        """
        read = self._read_next()
        expected = dap_response
        print("\n === handle_response ===")
        print("read    : " + str(read))
        print("expected: " + str(expected))
        print("\n")
        if not self._compare(read, expected):
            raise ValueError

    def get_script_entry(self, num=None):
        """

        Parameters
        ----------
        num : int

        Returns
        -------
        entry : Json
            script field entry

        """
        if num is None:
            num = self._scenario_script_cur
        else:
            if num >= self._scenario_script_elements:
                raise ValueError("In script there are only 0..%i record, but you tried to get number %i" % (
                    (self._scenario_script_elements - 1), num))
        entry = self._loaded_sc["script"][num]
        return Json(entry)

    def _compare(self, read, expected):
        """

        Parameters
        ----------
        read : dict or Json
        expected : dict or Json

        Returns
        -------
        bool
            result of comparing

        """
        if self.state["WithoutChecking"]:
            return True
        for exp_k, exp_v in expected.items():  # key and value
            read_v = read.get(exp_k)
            if read_v is None:
                return False  # key sets is different
            if isinstance(exp_v, dict) or isinstance(exp_v, Json):  # if we are working with a branch of the tree
                if not self._compare(read_v, exp_v):  # comparing branches
                    return False  # if branches are different
            else:
                if not (exp_v == ANY):  # if value matters
                    if exp_v != read_v:
                        return False  # values is not match
        return True

    def load_scenario(self, name):
        """Scenarios located in ./scenarios"""
        if name[:-5] != ".json":
            name += ".json"
        scr_path = os.path.dirname(os.path.abspath(__file__))
        f_path = os.path.join(scr_path, "scenarios", name)
        if not os.path.exists(f_path):
            raise IOError
        f = open(f_path, 'r')
        sc = Json(f)
        self._loaded_sc = sc
        self._scenario_script_elements = len(sc["script"])
        self._scenario_script_cur = 0

    def print_scenario(self):
        print(
            json.dumps(self._loaded_sc, sort_keys=True, indent=4)
        )

    def execute_scenario(self, name=None):
        """

        Parameters
        ----------
        name : str
            Name of scenario's file

        Returns
        -------
        int
            errors during executing

        """
        if name is not None:
            self.load_scenario(name)
        self._start()
        while self._scenario_script_cur < self._scenario_script_elements:
            try:
                self.action()
            except Exception as e:
                self.state["Errors"] = True
                break
            self._scenario_script_cur += 1
        return self._end()

    def _start(self):
        print("Loaded scenario: %s" % self._loaded_sc["name"])
        self.connect()

    def _end(self):
        if self.state["Errors"]:
            res_str = "is NOT completed (stopped on entry %i)" % self._scenario_script_cur
            print("Error!")
        else:
            res_str = "is completed"
        print("The scenario %s %s." % (self._loaded_sc["name"], res_str))
        self.disconnect()
        return not self.state["Errors"]

    def send_terminate_rq(self):
        term = {
            "arguments": {
                "restart": "false"
            },
            "command": "disconnect",
            "seq": "95",
            "type": "request"
        }
        self._write(term)

    def _write(self, msg):
        """

        Parameters
        ----------
        msg : str or dict or Json

        Returns
        -------

        """
        # def add_header(in_str):
        if isinstance(msg, dict):
            msg_str = json.dumps(msg, separators=(',', ':'))  # to str
            msg_bytes = msg_str.encode()  # to bytes
        elif isinstance(msg, str):
            msg_dict = json.loads(msg)
            msg_str = json.dumps(msg_dict, separators=(',', ':'))  # to str
            msg_bytes = msg_str.encode()  # to bytes
        elif isinstance(msg, Json):
            msg_bytes = msg.to_bytes()
        else:
            raise TypeError("Not Json, str or dict!")
        sz = len(msg_bytes)
        header = "Content-Length: %i\r\n\r\n" % sz  # type: str
        header_bytes = header.encode()
        to_send = header_bytes + msg_bytes
        self.__socket.send(to_send)

    def _read_from_socket(self):
        """
        Read socket.recv to the readed_jsons queue

        Returns
        -------

        """
        data = ""
        try:
            data = self.__socket.recv(SOCKET_BUFFER_SIZE)
        except socket.timeout:
            self.state["Errors"] = True
            raise socket.timeout("Error! Socket did not get info, when expected")
        if not data:
            s = "Empty"
        else:
            s = data.decode('utf-8')
        print("\n === Read from socket === \n%s\n" % s)
        self._load_to_queue(s)

    def _load_to_queue(self, data_str):
        """

        Parameters
        ----------
        data_str : str

        Returns
        -------

        """
        list_to_put = []
        data_list_med = re.split(DAP_HEADER_PATTERN, data_str)
        for d in data_list_med:
            if len(d):
                d_stripped = d.strip('\n''\r')
                d_stripped = re.sub(DAP_HEADER_PATTERN, "", d_stripped)
                if d_stripped[0] == '{':
                    list_to_put.append(d_stripped)

        for d in list_to_put:
            try:
                to_q = Json(d)
            except Exception as e:
                print(e)
                to_q = d
            self.__readed_jsons.put(to_q)

    def _read_next(self):
        if self.__readed_jsons.empty():
            self._read_from_socket()
        s = self.__readed_jsons.get()
        return s


if __name__ == '__main__':
    cda = ClientDa(scenario="init")
