class DebuggerError(RuntimeError):
    pass


class DebuggerTargetStateTimeoutError(DebuggerError):
    pass
