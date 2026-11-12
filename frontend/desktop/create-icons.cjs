// Derive native Windows sizes from Gemini's purple-background app icon.
// Run with: node desktop/create-icons.cjs (desktop assets only).
// Updating the web favicon is a separate opt-in: --favicon.
const fs=require('node:fs/promises');
const path=require('node:path');
const sharp=require('sharp');

async function main(){
 const args=process.argv.slice(2);
 if(args.some(arg=>arg!=='--favicon'))throw Error('Usage: node desktop/create-icons.cjs [--favicon]');
 const source=path.resolve(__dirname,'../public/brand/staycraft_logo_icon.svg');
 const metadata=await sharp(source).metadata();
 if(!metadata.width||metadata.width!==metadata.height)throw Error('Desktop icon source must be a square image');
 const sizes=[16,20,24,32,40,48,64,128,256];
 const frames=await Promise.all(sizes.map(size=>sharp(source,{density:384}).resize(size,size).png().toBuffer()));
 const header=Buffer.alloc(6+16*frames.length);
 header.writeUInt16LE(1,2);
 header.writeUInt16LE(frames.length,4);
 let offset=header.length;
 frames.forEach((frame,index)=>{
  const entry=6+16*index,size=sizes[index];
  header[entry]=header[entry+1]=size===256?0:size;
  header.writeUInt16LE(1,entry+4);
  header.writeUInt16LE(32,entry+6);
  header.writeUInt32LE(frame.length,entry+8);
  header.writeUInt32LE(offset,entry+12);
  offset+=frame.length;
 });
 const directory=path.join(__dirname,'assets');
 await fs.mkdir(directory,{recursive:true});
 const icon=Buffer.concat([header,...frames]);
 await fs.writeFile(path.join(directory,'staycraft.ico'),icon);
 await fs.writeFile(path.join(directory,'staycraft.png'),frames.at(-1));
 if(args.includes('--favicon'))await fs.writeFile(path.resolve(__dirname,'../src/app/favicon.ico'),icon);
 console.log('Created StayCraft desktop'+(args.includes('--favicon')?' and favicon':'')+' assets: '+sizes.join(', ')+' px');
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
