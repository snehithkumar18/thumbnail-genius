import importlib
try:
    m = importlib.import_module('paddle')
    print('paddle import OK', getattr(m, '__version__', 'unknown'))
except Exception as e:
    print('paddle import failed:', e)

import pkgutil
print('paddlepaddle present (pkgutil):', pkgutil.find_loader('paddlepaddle') is not None)
print('paddle present (pkgutil):', pkgutil.find_loader('paddle') is not None)
