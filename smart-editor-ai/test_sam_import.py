import sys
print("Python Executable:", sys.executable)
try:
    import segment_anything
    print("SUCCESS: segment_anything imported successfully!")
except Exception as e:
    print("FAILED to import segment_anything:", e)
