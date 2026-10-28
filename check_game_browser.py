"""Real Chrome integration checks, no dependencies or production test hooks.

Serve dist, launch an isolated headless Chrome with --remote-debugging-port=9338,
then run: python check_game_browser.py [--port 9338] [--url http://127.0.0.1:8018]
Only the isolated browser's game record is cleared. Screenshots are optional.
"""
import argparse
import base64
import json
import os
from pathlib import Path
import re
import socket
import struct
import tempfile
import time
from urllib.parse import urlsplit
import urllib.request

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--port',type=int,default=9338)
parser.add_argument('--url',default='http://127.0.0.1:8018')
parser.add_argument('--screenshots',type=Path)
args=parser.parse_args()
pages=json.load(urllib.request.urlopen(f'http://127.0.0.1:{args.port}/json',timeout=10))
endpoint=urlsplit(next(p['webSocketDebuggerUrl'] for p in pages if p['type']=='page'))
sock=socket.create_connection((endpoint.hostname,endpoint.port),timeout=15)
key=base64.b64encode(os.urandom(16)).decode()
sock.sendall(f'GET {endpoint.path} HTTP/1.1\r\nHost: {endpoint.netloc}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n'.encode())
header=b''
while not header.endswith(b'\r\n\r\n'):header+=sock.recv(1)
assert b'101' in header
sequence_id=0
errors=[]
def read(length):
    result=b''
    while len(result)<length:
        part=sock.recv(length-len(result))
        if not part:raise EOFError('Chrome closed the connection')
        result+=part
    return result
def call(method,params=None):
    global sequence_id
    sequence_id+=1
    payload=json.dumps({'id':sequence_id,'method':method,'params':params or {}}).encode()
    size=len(payload);mask=os.urandom(4)
    head=bytes([129,128|size]) if size<126 else bytes([129,254])+struct.pack('!H',size) if size<65536 else bytes([129,255])+struct.pack('!Q',size)
    sock.sendall(head+mask+bytes(value^mask[i%4] for i,value in enumerate(payload)))
    while True:
        _,second=read(2);size=second&127
        if size==126:size=struct.unpack('!H',read(2))[0]
        elif size==127:size=struct.unpack('!Q',read(8))[0]
        data=json.loads(read(size))
        if data.get('method')=='Runtime.exceptionThrown':errors.append(data['params']['exceptionDetails'])
        if data.get('id')==sequence_id:
            assert 'error' not in data,data
            return data.get('result',{})
def js(expression):
    result=call('Runtime.evaluate',{'expression':expression,'returnByValue':True})
    assert 'exceptionDetails' not in result,result
    return result['result'].get('value')
def wait_for(expression,timeout=6):
    until=time.monotonic()+timeout
    while time.monotonic()<until:
        if js(expression):return
        time.sleep(.04)
    raise AssertionError('Timed out: '+expression+'; phase='+str(phase()))
def phase():return js('document.querySelector(".game-shell")?.dataset.phase')
def score():return int(js('document.querySelector(".game-shell").dataset.score'))
def click(selector):
    assert js(f'!!document.querySelector({json.dumps(selector)})'),selector
    js(f'document.querySelector({json.dumps(selector)}).click()')
def viewport(width,touch=False):
    call('Emulation.setDeviceMetricsOverride',{'width':width,'height':1100,'deviceScaleFactor':1,'mobile':touch})
    call('Emulation.setTouchEmulationEnabled',{'enabled':touch,'maxTouchPoints':1})
def load(page='index.html'):
    call('Page.navigate',{'url':args.url+'/'+page})
    wait_for('document.readyState==="complete" && !!document.querySelector(".js")')
    if page=='index.html':wait_for('!!document.querySelector(".game-start:not(:disabled)")')
def shot(name):
    if not args.screenshots:return
    time.sleep(.5)
    args.screenshots.mkdir(parents=True,exist_ok=True)
    data=call('Page.captureScreenshot',{'format':'png'})
    (args.screenshots/(name+'.png')).write_bytes(base64.b64decode(data['data']))
def centre(selector,scroll=False):
    if scroll:js(f'document.querySelector({json.dumps(selector)}).scrollIntoView({{block:"center",behavior:"instant"}})')
    return js(f'(()=>{{const r=document.querySelector({json.dumps(selector)}).getBoundingClientRect();return {{x:r.left+r.width/2,y:r.top+r.height/2}}}})()')
def drag_cable(key,touch=False):
    a=centre(f'[data-cable="{key}"]',True)
    b=centre(f'[data-socket="{key}"]')
    if touch:
        call('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[dict(a,id=0)]})
        for step in [1,2,3]:
            point={'x':a['x']+(b['x']-a['x'])*step/3,'y':a['y']+(b['y']-a['y'])*step/3,'id':0}
            call('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[point]})
        call('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:
        call('Input.dispatchMouseEvent',dict(a,type='mouseMoved'))
        call('Input.dispatchMouseEvent',dict(a,type='mousePressed',button='left',clickCount=1))
        call('Input.dispatchMouseEvent',dict(b,type='mouseMoved',button='left',buttons=1))
        call('Input.dispatchMouseEvent',dict(b,type='mouseReleased',button='left',clickCount=1))
    wait_for(f'document.querySelector("[data-cable={key}]").disabled')
def cables():
    for key in 'ABC':click(f'[data-cable="{key}"]');click(f'[data-socket="{key}"]')
def light_sequence():
    wait_for('document.querySelector(".game-shell").dataset.phase==="lights-preview"')
    return [int(number)-1 for number in re.findall(r'\d',js('document.querySelector(".sequence-caption").textContent'))]
def lights(order):
    wait_for('document.querySelector(".game-shell").dataset.phase==="lights"')
    for index in order:click(f'[data-lamp="{index}"]')
def find_target():return int(js('document.querySelector(".mato-peek").closest("button").dataset.equipment'))

call('Runtime.enable');call('Page.enable')
viewport(1440);load()
js('localStorage.removeItem("mato-festival-record")');load();errors.clear()
js('document.querySelector("#festival-game").scrollIntoView({behavior:"instant"})');time.sleep(.3)
shot('game-lobby-desktop')
assert phase()=='idle'
time.sleep(.3)
assert js('document.querySelector("[data-time]").textContent').strip()=='30 s'
click('[data-action=start]');assert phase()=='cables' and score()==0
click('[data-cable=A]');click('[data-socket=B]');assert score()==0
assert 'nefázuj' in js('document.querySelector(".game-radio").textContent')
click('[data-socket=A]')
drag_cable('B')
# Keyboard-only connection of the third cable.
for selector in ['[data-cable=C]','[data-socket=C]']:
    js(f'document.querySelector({json.dumps(selector)}).focus()')
    call('Input.dispatchKeyEvent',{'type':'keyDown','key':'Enter','code':'Enter','windowsVirtualKeyCode':13,'text':'\r','unmodifiedText':'\r'})
    call('Input.dispatchKeyEvent',{'type':'keyUp','key':'Enter','code':'Enter','windowsVirtualKeyCode':13})
assert score()==100
order=light_sequence();assert sorted(order)==[0,1,2]
wait_for('document.querySelector(".game-shell").dataset.phase==="lights"')
click(f'[data-lamp="{(order[0]+1)%3}"]');assert score()==90
assert 'Nemá prečo' in js('document.querySelector(".game-radio").textContent')
lights(order);assert score()==190
wait_for('document.querySelector(".game-shell").dataset.phase==="find"')
target=find_target();click(f'[data-equipment="{(target+1)%6}"]');assert score()==180
shot('game-find-desktop')
click(f'[data-equipment="{target}"]');assert phase()=='won'
remaining=int(js('document.querySelector("[data-final-time]").textContent').split()[0])
final=score();assert final==280+remaining*5,(final,remaining)
assert int(js('localStorage.getItem("mato-festival-record")'))==final
assert js('!!document.querySelector(".new-record")')
shot('game-victory')
for _ in range(4):click('[data-action=greet-mato]')
assert phase()=='won'
click('[data-action=greet-mato]');assert phase()=='secret'
assert 'CERTIFIKOVANÝ KKT' in js('document.querySelector(".game-result h3").textContent')
shot('game-secret')
click('[data-action=result]');assert phase()=='won' and score()==final
print('PASS click/mouse drag/keyboard, penalties, all tasks, bonus, record, secret',flush=True)

# Restart while a sequence preview has pending callbacks: no stale transition.
click('[data-action=start]');assert score()==0 and phase()=='cables'
assert js('document.querySelectorAll(".is-connected").length')==0
cables();light_sequence();click('[data-action=exit]');click('[data-action=start]')
time.sleep(2.5);assert phase()=='cables' and score()==0
assert int(js('document.querySelector("[data-time]").textContent').split()[0]) in (27,28)
assert js('document.querySelectorAll("[data-cable]:disabled").length')==0
# Deadline expiry wins over an input delivered before the next interval callback.
cables();lights(light_sequence())
wait_for('document.querySelector(".game-shell").dataset.phase==="find"')
target=find_target()
js('window.__originalNow=Date.now; const expired=Date.now()+31000; Date.now=()=>expired; document.querySelector('+json.dumps(f'[data-equipment="{target}"]')+').click()')
assert phase()=='lost' and score()==200
assert js('document.querySelector("[data-final-time]").textContent')=='0 s'
assert int(js('localStorage.getItem("mato-festival-record")'))==max(final,200)
js('Date.now=window.__originalNow;delete window.__originalNow')
time.sleep(.4);assert phase()=='lost'
shot('game-defeat')
click('[data-action=start]');assert score()==0 and phase()=='cables'
click('[data-action=exit]');assert phase()=='idle'
load();assert int(js('document.querySelector("[data-record]").textContent'))==max(final,200)
print('PASS cancellation, replay reset, wall-clock expiry, stopped timer, persisted record',flush=True)

viewport(320,True);load();click('[data-action=start]')
centre('[data-cable=A]',True);before=js('scrollY')
drag_cable('A',True);assert abs(js('scrollY')-before)<3
click('[data-cable=B]');click('[data-socket=B]');click('[data-cable=C]');click('[data-socket=C]')
order=light_sequence();lights(order)
wait_for('document.querySelector(".game-shell").dataset.phase==="find"')
assert js('document.documentElement.scrollWidth<=innerWidth')
js('document.querySelector(".game-view").scrollIntoView({behavior:"instant",block:"center"})');shot('game-find-mobile')
click(f'[data-equipment="{find_target()}"]');assert phase()=='won'
for _ in range(5):click('[data-action=greet-mato]')
assert phase()=='secret' and js('document.documentElement.scrollWidth<=innerWidth')
click('[data-action=result]');click('[data-action=back]');assert phase()=='idle'
print('PASS 320px touch drag, no accidental scroll, tap alternatives, all mobile tasks',flush=True)

for width in [320,390,768,1024,1920]:
    viewport(width);load();click('[data-action=start]')
    assert js('document.documentElement.scrollWidth<=innerWidth'),width
    click('[data-action=exit]')
    assert js('document.documentElement.scrollWidth<=innerWidth'),width
call('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-motion','value':'reduce'}]})
load();click('[data-action=start]');cables();order=light_sequence();lights(order)
wait_for('document.querySelector(".game-shell").dataset.phase==="find"')
click(f'[data-equipment="{find_target()}"]')
assert phase()=='won'
assert js('getComputedStyle(document.querySelector(".game-confetti")).display')=='none'
call('Emulation.setEmulatedMedia',{'features':[]})
# Storage can be unavailable; neither the game nor the rest of the site may fail.
script=call('Page.addScriptToEvaluateOnNewDocument',{'source':'Object.defineProperty(window,"localStorage",{get(){throw new DOMException("Storage blocked","SecurityError")}})'})['identifier']
load();assert js('!document.querySelector("[data-storage-note]").hidden')
click('[data-action=start]');assert phase()=='cables'
call('Page.removeScriptToEvaluateOnNewDocument',{'identifier':script})
print('PASS responsive widths, reduced-motion gameplay, blocked-storage fallback',flush=True)

viewport(390)
for page in ['catalog.html','akira.html','favorites.html']:
    load(page)
    assert js('document.documentElement.scrollWidth<=innerWidth'),page
    click('.menu-toggle');assert js('!document.querySelector("nav").inert')
    call('Input.dispatchKeyEvent',{'type':'keyDown','key':'Escape','code':'Escape'})
    assert js('document.querySelector("nav").inert')
js('document.querySelector("form").requestSubmit()')
assert js('document.querySelector("#form-status").textContent').startswith('Skontroluj')
with tempfile.TemporaryDirectory(prefix='mato-game-qa-') as download_path:
    download_dir=Path(download_path)
    call('Browser.setDownloadBehavior',{'behavior':'allow','downloadPath':str(download_dir.resolve())})
    js("document.querySelector('[name=name]').value='Game QA';document.querySelector('[name=email]').value='qa@example.com';document.querySelector('[name=event]').value='Festival';document.querySelector('[name=location]').value='Bratislava';document.querySelector('[name=date]').value='2027-06-01';document.querySelector('form').requestSubmit()")
    assert js('document.querySelector("#form-status").textContent').startswith('Súbor je pripravený')
    for _ in range(50):
        if list(download_dir.glob('dopyt-pre-mata*.txt')):break
        time.sleep(.1)
    assert any('Game QA' in p.read_text(encoding='utf-8-sig') for p in download_dir.glob('dopyt-pre-mata*.txt'))
assert not errors,errors
print('PASS existing pages/menu/form download; no JavaScript exceptions',flush=True)
sock.close()
