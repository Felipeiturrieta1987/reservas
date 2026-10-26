import os
d=os.path.dirname(os.path.abspath(__file__))
t=open(d+'/template.html').read()
css=open(d+'/style.css').read()
order=['api','core','dashboard','ops','clients','booking','settings','main']
js='\n'.join(open(f'{d}/js/{n}.js').read() for n in order)
assert '</script' not in js
out='<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0A0908"><meta name="description" content="Reserva tu hora en Bellarium: bronceado marquiña y HIFU 7D en Ñuñoa.">\n'+t.replace('/*CSS*/',css).replace('/*JS*/',js).replace('<title>','<title>',1)
# poner body
out=out.replace('<div id="app"></div>','</head><body>\n<div id="app"></div>',1)
# svg sprite estaba antes de #app dentro del head => mover: reconstruir
head,rest=out.split('</head><body>\n',1)
# extraer sprite del head
import re
m=re.search(r'<svg width="0".*?</svg>',head,re.S)
sprite=m.group(0);head=head.replace(sprite,'')
out=head+'</head><body>\n'+sprite+rest+'</body></html>'
open(d+'/../public/index.html','w').write(out)
print(len(out))
