idf_component_register(SRCS "gcov_example_main.c" "gcov_example_func.c" "some_funcs.c"
                    INCLUDE_DIRS ".")

set_source_files_properties(some_funcs.c
    PROPERTIES COMPILE_FLAGS
    --coverage)
