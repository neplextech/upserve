"""Read an update offer without executing downloaded software (Python 3)."""
import json
import urllib.request

request = urllib.request.Request('http://localhost:3000/demo/stable/generic/update/0.9.0')
with urllib.request.urlopen(request, timeout=10) as response:
    if response.status == 204:
        print('No update')
    else:
        offer = json.load(response)
        print(f"Available version: {offer['version']}")
        # Select the platform, download, verify integrity and signatures, then ask
        # the user to install using their platform's supported installer.
