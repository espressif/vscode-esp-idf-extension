# Define the Invoke-idfpy function
function global:Invoke-idfpy {
    & python.exe `
    "$($env:IDF_PATH)\tools\idf.py" @args
}

function global:esptool.py {
  & python.exe `
  "$($env:IDF_PATH)\components\esptool_py\esptool\esptool.py" @args
}

function global:espefuse.py {
  & python.exe `
  "$($env:IDF_PATH)\components\esptool_py\esptool\espefuse.py" @args
}

function global:espsecure.py {
  & python.exe `
  "$($env:IDF_PATH)\components\esptool_py\esptool\espsecure.py" @args
}

function global:otatool.py {
  & python.exe `
  "$($env:IDF_PATH)\components\app_update\otatool.py" @args
}

function global:parttool.py {
  & python.exe `
  "$($env:IDF_PATH)\components\partition_table\parttool.py" @args
}

# Create an alias for the function
New-Alias -Name idf.py -Value Invoke-idfpy -Force -Scope Global