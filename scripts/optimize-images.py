"""Create web-sized derivatives with macOS sips; retain all supplied originals."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess,json
root=Path(__file__).resolve().parent.parent
specs=[
 ("Maker at the cottage doorway.png","epilogue.jpg",1672,88),
 ('Finished Walnut Piano by the Fireside.png','finished-piano.jpg',1672,88),
 ('Antique Brass Dragon Knocker at Night.png','cottage.jpg',1672,86),
 ('final-room.png','workshop.jpg',1660,86),('workbench.png','workbench.jpg',1672,86),('poem.png','writing-desk.jpg',1672,88),
 ('Antique Handcrafted Piano Keyboard.png','keyboard.jpg',1800,90),('instrument-walnut.png','walnut.jpg',1600,82),
 ('Weathered Walnut Portrait Frame.png','portrait-frame.jpg',600,88),('aged-parchment.png','parchment.png',850,0),
 ('Cozy cottage hearth with sleeping basset.png','portrait-1.jpg',600,87),
 ("The Maker's First Spark.png",'portrait-2.jpg',600,87),('Carved hands, empty chair.png','portrait-3.jpg',600,87),('The maker’s unwritten ending.png','portrait-4.jpg',600,87),
 ('Cozy cottage hearth with sleeping basset copy2.png','portrait-1-blurred.jpg',600,82),
 ("The Maker's First Spark copy2.png",'portrait-2-blurred.jpg',600,82),('Carved hands, empty chair copy2.png','portrait-3-blurred.jpg',600,82),('The maker’s unwritten ending copy2.png','portrait-4-blurred.jpg',600,82),
 *[(f'button{i}.png',f'button-{i}.jpg',600,90) for i in range(1,5)],('complete_button.png','complete-button.jpg',800,90),
 *[(f'knocker/k{i}.png',f'knocker-{i}.jpg',320,92) for i in range(1,5)]]
def convert(spec):
 source,name,width,quality=spec
 args=['sips','--resampleWidth',str(width),'-s','format','jpeg' if quality else 'png']
 if quality:args+=['-s','formatOptions',str(quality)]
 subprocess.run(args+[str(root/'assets'/source),'--out',str(root/'assets/web'/name)],check=True,stdout=subprocess.DEVNULL)
 return source,'web/'+name
with ThreadPoolExecutor(max_workers=4) as pool: mapping=dict(pool.map(convert,specs))
(root/'image-assets.js').write_text('// Web derivatives only; original supplied files remain in assets/.\nexport const imageAssets = '+json.dumps(mapping,ensure_ascii=False,indent=2)+';\nexport const assetURL = filename => new URL(`assets/${imageAssets[filename] || filename}`, import.meta.url).href;\n')
print('Optimized',len(specs),'images:',round(sum((root/'assets/web'/s[1]).stat().st_size for s in specs)/1048576,2),'MiB')
print('Entrance image and four frames:',round(sum((root/'assets/web'/s[1]).stat().st_size for s in specs if s[1]=='cottage.jpg' or s[1].startswith('knocker-'))/1024),'KiB')
