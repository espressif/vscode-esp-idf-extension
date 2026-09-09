#include <stdio.h>
#include "esp_log.h"

static const char *TAG = "hello_world";
static int __attribute__((noinline)) add_one(int x);
void app_main(void)
{
    volatile int a = 1;
    volatile int b = a + 1;
    ESP_LOGI(TAG, "UI test monitor output check");
    printf("Result: %d\n", b);
    volatile int c = add_one((int)a);
    (void)c;
}

static int __attribute__((noinline)) add_one(int x)
{
    return x + 1;
}
