import logging


def logger_init(log_name="Log", log_level=None, stream_handler=None, file_handler=None):
    """
    Parameters
    ----------
    log_name : str
    log_level : int
    stream_handler : logging.StreamHandler
    file_handler : logging.FileHandler

    Returns
    -------
    logger
    """
    logger = logging.getLogger(log_name)
    if log_level:
        logger.setLevel(log_level)
    else:
        logger.setLevel(logging.DEBUG)
    if stream_handler:
        logger.addHandler(stream_handler)
    if file_handler:
        logger.addHandler(file_handler)
    logger.propagate = False
    return logger
