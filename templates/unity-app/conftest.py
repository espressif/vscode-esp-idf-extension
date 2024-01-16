'''
Project: ESP-IDF VSCode Extension
File Created: Thursday, 20th July 2023 1:02:21 pm
Copyright 2023 Espressif Systems (Shanghai) CO LTD

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
'''


def pytest_addoption(parser):
    parser.addoption("--test-name", action="store", default="test-name")


def pytest_generate_tests(metafunc):
    # This is called for every test. Only get/set command line arguments
    # if the argument is specified in the list of test "fixturenames".
    option_value = metafunc.config.option.test_name
    if 'test_name' in metafunc.fixturenames and option_value is not None:
        metafunc.parametrize("test_name", [option_value])
