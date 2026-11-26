#include <stdlib.h>
#include "esp_log.h"

static const char *TAG = "gdb_stub";

void app_main(void)
{
    ESP_LOGI(TAG, "GDB stub panic test");
    abort();
}
