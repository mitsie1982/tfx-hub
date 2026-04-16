import os
import shutil
import time


def publish_model(saved_model_dir, model_base_path, version=None):
    version = version or str(int(time.time()))
    target = os.path.join(model_base_path, version)
    tmp = target + '.tmp'
    shutil.copytree(saved_model_dir, tmp)
    os.rename(tmp, target)  # atomic on same filesystem
    return target
