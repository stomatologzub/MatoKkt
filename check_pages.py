from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import re

class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[]; self.links=[]; self.headings=0; self.active=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='h1':self.headings+=1
        if a.get('aria-current')=='page':self.active+=1
        for attr in ('href','src'):
            if attr in a:self.links.append(a[attr])

root=Path('dist'); pages=list(root.glob('*.html'))
assert len(pages)==4
for path in pages:
    text=path.read_text(encoding='utf-8'); page=Page();page.feed(text)
    assert 'lang="sk"' in text
    assert not re.search('[А-Яа-яЁё]',text.replace('матьо це ккт',''))
    assert len(page.ids)==len(set(page.ids)),path
    assert page.headings==1,(path,page.headings)
    assert page.active==1,path
    for link in page.links:
        parts=urlsplit(link)
        if parts.scheme:continue
        target=root/parts.path if parts.path else path
        assert target.is_file(),(path,link)
        if parts.fragment:
            dest=Page();dest.feed(target.read_text(encoding='utf-8'))
            assert parts.fragment in dest.ids,(path,link)
    print(path.name+': navigation, assets, anchors, language and headings OK')
home=(root/'index.html').read_text(encoding='utf-8')
for phrase in ('mato nefazuj sa','keby som vzduch tak tam neprejdem','nema preco to nefunhovat'):
    assert phrase in home
for path in pages:
    text=path.read_text(encoding='utf-8')
    assert 'Maťo' in text and 'mato je kokot' in text
    assert 'Akira' not in text and 'Obľúbené' not in text
contact=(root/'favorites.html').read_text(encoding='utf-8')
assert 'id="booking"' in contact and 'nič sa automaticky neodosiela' in contact
for field in ('name','email','event','location','date','service','details'):
    assert f'name="{field}"' in contact
print('Promotional copy, slogans and enquiry form fields OK')
