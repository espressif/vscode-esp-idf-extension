class GdbFrame(object):
    def __init__(self,
                 func=None,
                 addr=None,
                 level=None,
                 args=None,
                 file=None,
                 fullname=None,
                 line=None):
        self.func = func  # type: str
        self.addr = addr  # type: str
        self.level = level  # type: str
        self.args = args  # type: list
        self.file = file  # type: str
        self.fullname = fullname  # type: str
        self.line = line  # type: str


class GdbThread(object):
    def __init__(self,
                 target_id=None,
                 state=None,
                 thread_id=None,
                 frame=None,
                 details=None):
        self.target_id = target_id  # type: str
        self.state = state  # type: str
        self.id = thread_id  # type: str
        self.frame = frame  # type: GdbFrame
        self.details = details  # type: str
