import requests
import json
url='http://127.0.0.1:8000/detect'
payload={'image_url':'https://i.ytimg.com/vi/DamYxq06LqI/maxresdefault.jpg','max_dim':1024}
resp = requests.post(url, json=payload, timeout=60)
print('status',resp.status_code)
try:
    j=resp.json()
    print('layers',len(j.get('layers',[])))
    for i,l in enumerate(j.get('layers',[])[:20]):
        print(i, l.get('type'), l.get('label'), 'bbox=', l.get('bbox'))
except Exception as e:
    print('err',e)
    print(resp.text[:1000])
