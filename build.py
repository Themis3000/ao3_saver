import zipfile
import os

chrome_zf = zipfile.ZipFile('chrome.zip', 'w')
firefox_zf = zipfile.ZipFile('firefox.zip', 'w')
for dirname, subdirs, files in os.walk("./"):
    if dirname.startswith("./."):
        continue
    chrome_zf.write(dirname)
    firefox_zf.write(dirname)
    for filename in files:
        if filename.endswith(".py") or filename.endswith(".zip"):
            continue
        if filename == "manifest.json":
            chrome_zf.write(os.path.join(dirname, filename))
            continue
        if filename == "manifest-old.json":
            firefox_zf.write(os.path.join(dirname, filename), "manifest.json")
            continue
        chrome_zf.write(os.path.join(dirname, filename))
        firefox_zf.write(os.path.join(dirname, filename))

chrome_zf.close()
firefox_zf.close()
