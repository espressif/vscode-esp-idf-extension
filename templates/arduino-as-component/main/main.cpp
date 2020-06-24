#include "Arduino.h"

extern "C" void app_main()
{
    initArduino();
    pinMode(4, OUTPUT);
    digitalWrite(4, HIGH);
    // Do your own thing
}