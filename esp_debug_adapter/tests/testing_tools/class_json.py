import json
import sys

PY3 = sys.version_info[0] == 3
PY2 = sys.version_info[0] == 2
WIN32 = sys.platform == "win32"

if PY3:
    import io

    unicode = str
    file = io.TextIOWrapper


class Json:
    def __init__(self, in_obj=None):
        self.__dict__ = {}
        if in_obj is not None:
            self.load(in_obj)

    def load(self, in_obj):
        if type(in_obj) == str or type(in_obj) == unicode:
            unified_string = in_obj.encode()
            self.__dict__ = json.loads(unified_string)
        elif type(in_obj) == file:
            self.__dict__ = json.load(in_obj)
        elif type(in_obj) == dict:
            self.__dict__ = in_obj
        # elif type(in_obj) == unicode:
        #     unified_string = in_obj.encode()
        #     self.__dict__ = json.loads(unified_string)
        elif type(in_obj) == bytearray:
            in_as_str = in_obj.decode()
            self.__dict__ = json.loads(in_as_str)
        else:
            raise TypeError("Could load only file, str, dict of bytearray")

    def to_str_formated(self):
        return json.dumps(self.__dict__, indent=4, sort_keys=True)  # to str

    def to_bytes(self):
        s = self.to_str()
        r = bytearray(s, encoding='utf-8')
        return r

    def to_str(self):
        r = json.dumps(self.__dict__, separators=(',', ':'))  # to str
        return r

    def to_dict(self):
        return self.__dict__

    def get(self, k, default=None):
        res = self.__dict__.get(k, default)
        return res

    def items(self):
        return self.__dict__.items()

    def __str__(self):
        return json.dumps(self.__dict__, separators=(',', ':'))

    def __getitem__(self, key):
        return self.__dict__[key]

    def __setitem__(self, key, value):
        self.__dict__[key] = value

    def __delitem__(self, key):
        del self.__dict__[key]

    def __contains__(self, key):
        return key in self.__dict__

    def __len__(self):
        return len(self.__dict__)

    def __repr__(self):
        return repr(self.__dict__)


def __test():
    my_str = """
    {
        "arguments": {
            "adapterID": "espidf", 
            "clientID": "vscode", 
            "clientName": "Visual Studio Code", 
            "columnsStartAt1": true, 
            "linesStartAt1": true, 
            "locale": "en-us", 
            "pathFormat": "path", 
            "supportsRunInTerminalRequest": true, 
            "supportsVariablePaging": true, 
            "supportsVariableType": true
        }, 
        "command": "initialize", 
        "seq": 1, 
        "type": "request"
    }"""
    my_str_as_bytes = str.encode(my_str)
    my_dict = {
        "arguments": {
            "adapterID": "espidf",
            "clientID": "vscode",
            "clientName": "Visual Studio Code",
            "columnsStartAt1": True,
            "linesStartAt1": True,
            "locale": "en-us",
            "pathFormat": "path",
            "supportsRunInTerminalRequest": True,
            "supportsVariablePaging": True,
            "supportsVariableType": True
        },
        "command": "initialize",
        "seq": 1,
        "type": "request"
    }

    my_json1 = Json(my_str)
    # a = my_json1.to_dict()
    # b = my_json1.to_bytes()
    # c = my_json1.to_str()
    # print(my_json1["type"])
    # new = str(my_json1)

    new1 = my_json1.get("Command")
    new2 = my_json1.get("command")
    items = my_json1.items()
    print(items)
    print(new1)
    print(new2)


if __name__ == '__main__':
    __test()
