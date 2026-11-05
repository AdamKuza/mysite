from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
# Original display lettering: Cyrillic letterforms with broad roof strokes and narrow uprights.
letters={
'И':[(80,0,80,700),(80,0,500,700),(500,0,500,700),(70,700,220,700),(380,700,550,700)],
'Е':[(100,0,100,700),(70,700,550,700),(100,350,450,350),(100,0,520,0)],
'Р':[(100,0,100,700),(70,700,510,700),(510,350,510,700),(100,350,510,350)],
'У':[(90,350,90,700),(510,0,510,700),(90,350,510,350),(220,0,510,0),(60,700,220,700),(390,700,550,700)],
'С':[(100,0,100,700),(70,700,540,700),(100,0,540,0)],
'А':[(100,0,100,700),(500,0,500,700),(70,700,540,700),(100,320,500,320)],
'Л':[(90,0,240,700),(500,0,500,700),(210,700,540,700)],
'М':[(100,0,100,700),(500,0,500,700),(100,700,300,340),(300,340,500,700),(60,700,180,700),(420,700,550,700)],
'З':[(60,700,500,700),(500,0,500,700),(170,350,500,350),(70,0,500,0)],
'Ь':[(100,0,100,700),(100,350,500,350),(500,0,500,350),(100,0,500,0)]}
fb=FontBuilder(1000,isTTF=True); names=['.notdef','space']+list(letters);fb.setupGlyphOrder(names); glyphs={};metrics={}
for name in names:
 pen=TTGlyphPen(None)
 for x,y,X,Y in letters.get(name,[]):
  if y==Y:
   thick=110 if y==700 else 48
   pts=[(x,y),(X,y),(X,y+thick),(x,y+thick)]
  elif x==X:pts=[(x,y),(x+52,y),(X+52,Y),(X,Y)]
  else:pts=[(x,y),(x+50,y),(X+50,Y),(X,Y)]
  pen.moveTo(pts[0]);[pen.lineTo(p) for p in pts[1:]];pen.closePath()
 glyphs[name]=pen.glyph();metrics[name]=(650,0)
fb.setupGlyf(glyphs);fb.setupHorizontalMetrics(metrics);fb.setupHorizontalHeader(ascent=850,descent=-150)
fb.setupCharacterMap({**{ord(c):c for c in letters},**{ord(c.lower()):c for c in letters},32:'space'})
fb.setupNameTable({'familyName':'Jerusalem Cyrillic','styleName':'Regular','uniqueFontIdentifier':'JerusalemCyrillic-1','fullName':'Jerusalem Cyrillic','psName':'JerusalemCyrillic','version':'Version 1.0'});fb.setupOS2(sTypoAscender=850,sTypoDescender=-150,usWinAscent=850,usWinDescent=150);fb.setupPost(keepGlyphNames=False);fb.save('src/fonts/Jerusalem-Cyrillic.ttf')
Path('src/fonts/Jerusalem-LICENSE.txt').write_text('Jerusalem Cyrillic — original display lettering created for this website.\nCopyright 2026. Licensed under the MIT License.\nPermission is hereby granted, free of charge, to any person obtaining a copy of this font to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies, subject to including this notice.\nTHE FONT IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.\n')
