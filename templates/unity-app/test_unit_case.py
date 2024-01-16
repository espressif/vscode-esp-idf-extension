'''
Project: ESP-IDF VSCode Extension
File Created: Thursday, 20th July 2023 12:58:32 pm
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
import pytest
from pytest_embedded import Dut


def test_unit_test(dut: Dut, test_name: str) -> None:
    if test_name == "TEST_ALL":
        dut.run_all_single_board_cases()
    elif test_name[:11] == "TEST_GROUP=":
        dut.run_all_single_board_cases(test_name[12:])
    else:
        dut.run_single_board_case(test_name)
