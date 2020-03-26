# Copyright (c) 2019 Fabio Zadrozny
#
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0

'''
Notes:

The full debug protocol as a json may be found at:

    https://raw.githubusercontent.com/Microsoft/vscode-debugadapter-node/master/debugProtocol.json

It's also provided as a typescript interface in:

    https://github.com/Microsoft/vscode-debugadapter-node/blob/master/protocol/src/debugProtocol.ts


The implementation of the ts debugger is at:

    https://github.com/Microsoft/vscode-debugadapter-node/

Mono example: https://github.com/Microsoft/vscode-mono-debug/blob/master/src/typescript/extension.ts

https://code.visualstudio.com/docs/extensionAPI/api-debugging has a brief overview.

https://code.visualstudio.com/docs/extensionAPI/extension-points provides a place with more info on the debugger package.json bits.

https://code.visualstudio.com/docs/extensions/example-debuggers has some examples.

https://github.com/Microsoft/ptvsd has the microsoft wrapper for pydevd.
'''


def generate_debugger():
    return {
        'type': 'PyDev',
        'label': 'PyDev (Python)',
        'languages': ['python'],
        'adapterExecutableCommand': 'pydev.start.debugger',
        'enableBreakpointsFor': {
            'languageIds': ['python', 'html'],
        },
        'configurationAttributes': {
            'launch': {
                'properties': {

                    'program': {
                        'type': 'string',
                        'description': 'The .py file that should be debugged (i.e.: python `program.py`).',
                    },
                    
                    'module': {
                        'type': 'string',
                        'description': 'The module to be debugged (i.e.: python -m `module`).',
                    },

                    'args': {
                        'type': ['string', 'array'],
                        'description': 'The command line arguments passed to the program.'
                    },

                    "cwd": {
                        "type": "string",
                        "description": "The working directory of the program.",
                        "default": "${workspaceFolder}"
                    },

                    "console": {
                        "type": "string",
                        "enum": [
                            "none",
                            "integratedTerminal",
                            "externalTerminal"
                        ],
                        "enumDescriptions": [
                            "VS Code debug console.",
                            "VS Code integrated terminal.",
                            "External terminal that can be configured in user settings."
                        ],
                        "description": "The specified console to launch the program.",
                        "default": "none"
                    },
                }
            }
        },

        "configurationSnippets": [
            {
                "label": "PyDev: Launch Python Program",
                "description": "Add a new configuration for launching a python program with the PyDev debugger.",
                "body": {
                    "type": "PyDev",
                    "name": "PyDev Debug (Launch)",
                    "request": "launch",
                    "cwd": "^\"\\${workspaceFolder}\"",
                    "console": "none",
                    "mainModule": "",
                    "args": [],
                }
            },
        ]
    }
