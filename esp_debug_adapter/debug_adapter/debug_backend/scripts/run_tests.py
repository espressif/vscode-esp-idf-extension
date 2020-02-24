import os
os.chdir(os.path.join(os.path.dirname(__file__), ".."))
os.system("python -m xmlrunner discover -s ./tests -o ./tests/reports")
