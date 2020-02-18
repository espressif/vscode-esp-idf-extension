from .client_da import ClientDa
import json


def test_connect_hello():
    c = ClientDa()
    c.connect()
    c._write("Hello")
    c._read_from_socket()
    c.disconnect()


def test_read_scenario():
    c = ClientDa()
    c.load_scenario("init")
    c.print_scenario()


def test_write_json():
    c = ClientDa()
    rq = """
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
    json_dict = json.loads(rq)
    c.connect()
    c._write(rq)


def test_init_json():
    c = ClientDa()
    c.load_scenario("init")
    c.connect()
    c.__scenario_script_cur = 0
    c.action()
    c.disconnect()


def test_scenario_action():
    c = ClientDa(wo_checking=False)
    # c.load_scenario()
    # c.set_scenario_script_cur(200)
    # c.execute_scenario("conn_check")
    c.execute_scenario("init")





if __name__ == '__main__':
    # build_x86()

    # test_load_buff_to_q()
    test_scenario_action()
