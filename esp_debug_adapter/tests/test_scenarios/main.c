#include <stdio.h>
//#include "freertos/FreeRTOS.h"
//#include "freertos/task.h"
//#include "esp_system.h"
//#include "esp_spi_flash.h"

static int __attribute__ ((noinline)) summ(int a, int b)
{
    int r = a + b;
    return r;
}

static void fibonacci_calc_once(void)
/* calculation of 3 fibonacci sequences: f0, f1 abd f2
 * f(n) = f(n-1) + f(n-2) -> f(n) : 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, ...*/
{

    volatile int f0_nm2, f1_nm2, f2_nm2; // n-2
    volatile int f0_nm1, f1_nm1, f2_nm1; // n-1
    volatile int f0_n, f1_n, f2_n; // n
    // setting three starting state for each f sequence: n-2 points:
    f0_nm2 = 0;
    f1_nm2 = 1;
    f2_nm2 = summ(1, 2);;
    // setting three starting state for each f sequence: n-1 points:
    f0_nm1 = 1;
    f1_nm1 = 2;
    f2_nm1 = 5;
    //
    f0_n = f0_nm1 + f0_nm2; // calculating f0_n
    f0_nm2 = f0_nm1; // n shift
    f0_nm1 = f0_n;
    f1_n = f1_nm1 + f1_nm2; // calculating f1_n
    f1_nm2 = f1_nm1; // n shift
    f1_nm1 = f1_n;
    f2_n = f2_nm1 + f2_nm2;
    f2_nm2 = f2_nm1; // n shift// calculating f2_n
    f2_nm1 = f2_n;
}

static void fibonacci_calc(void)
/* calculation of 3 fibonacci sequences: f0, f1 abd f2
 * f(n) = f(n-1) + f(n-2) -> f(n) : 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, ...*/
{

    volatile int f0_nm2, f1_nm2, f2_nm2; // n-2
    volatile int f0_nm1, f1_nm1, f2_nm1; // n-1
    volatile int f0_n, f1_n, f2_n; // n
    // setting three starting state for each f sequence: n-2 points:
    f0_nm2 = 0;
    f1_nm2 = 1;
    f2_nm2 = 3;
    // setting three starting state for each f sequence: n-1 points:
    f0_nm1 = 1;
    f1_nm1 = 2;
    f2_nm1 = 5;
    while (1)
    {
        f0_n = f0_nm1 + f0_nm2; // calculating f0_n
        f0_nm2 = f0_nm1; // n shift
        f0_nm1 = f0_n;
        f1_n = f1_nm1 + f1_nm2; // calculating f1_n
        f1_nm2 = f1_nm1; // n shift
        f1_nm1 = f1_n;
        f2_n = f2_nm1 + f2_nm2;
        f2_nm2 = f2_nm1; // n shift// calculating f2_n
        f2_nm1 = f2_n;
    }
}

void main()
{
    printf("Hello, Tester!\n");
    printf("Simple calculating...");
    fibonacci_calc_once();
    printf("If it was 4, it's ok. \nLet's calculate an infinite sequence!\n");
    fibonacci_calc();
    printf("You can't get here - the sequence is INFINITE!\n");
}
