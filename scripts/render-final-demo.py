"""Render retained actual-app clips + approved local narration. Does not publish."""
from pathlib import Path
import argparse,json,subprocess,wave,math,textwrap,os,shutil
ap=argparse.ArgumentParser();ap.add_argument('--narration',type=Path,default=Path('docs/DEMO-NARRATION.json'));ap.add_argument('take',type=Path);ap.add_argument('--production',type=Path,default=Path('output/playwright/final-demo/production'));args=ap.parse_args();p=args.production.resolve();p.mkdir(exist_ok=True,parents=True)
ff_path=os.environ.get('FFMPEG') or shutil.which('ffmpeg')
if not ff_path: raise SystemExit('Install FFmpeg with libx264, AAC and drawtext, or set FFMPEG to a working binary path.')
ff=Path(ff_path)
e=json.loads((args.take/'evidence.json').read_text());assert e.get('completed'),e.get('failure');raw=Path(e['raw']).resolve();marks={m['id']:m['seconds'] for m in e['marks']};items=json.loads(args.narration.read_text())
# Retain the actual actions; omit idle model waits. Original complete raw.webm remains beside evidence.json.
plans={
'opening': [('opening','baseline-jump')],
'possibility':[('baseline-jump','compound-request')],
'compound':[('compound-request','compound-waiting'),('compound-result','compound-preview')],
'verified':[('compound-preview','compound-applied')],
'float':[('compound-applied','float-landed')],
'manual':[('float-landed','manual-float')],
'canonical':[('canonical-read-request','canonical-read-waiting'),('canonical-read-result','canonical-read-verified')],
'baseline':[('canonical-read-verified','baseline-route-check')],
'checked':[('baseline-route-check','checked-waiting'),('checked-agent-activity','checked-applied')],
'replay':[('checked-applied','replay-reached')],
'closing':[('replay-reached','closing')],
}
def run(xs):subprocess.run([str(ff),'-hide_banner','-loglevel','error','-threads','2','-y']+xs,check=True)
def stamp(s,sep=','):
 n=round(s*1000);h,n=divmod(n,3600000);m,n=divmod(n,60000);ss,ms=divmod(n,1000);return f'{h:02}:{m:02}:{ss:02}{sep}{ms:03}'
concat=[];manifest={'sourceEvidence':str((args.take/'evidence.json').resolve()),'edits':'Actual UI recordings. Idle AI waiting time shortened. Some source frames held under narration. Labeled scripted-input runtime route replay; no human enjoyment study. No fixture, runtime injection, external publication or physical-phone claim.','voice':'Local Voicebox Kokoro af_heart, owner-approved Heart','scenes':[]};elapsed=0;srt=[];cue=1;transcript=['# Wonderbox — narrated actual-app walkthrough','','AI waiting time shortened. Some frames held under narration. Complete raw source retained. Route replay uses scripted inputs in the actual runtime and is not a human playtest.','']
for item in items:
 ident=item['id'];voice=p/'voice'/(ident+'.wav');parts=[];sourceIntervals=[]
 for j,(a,b) in enumerate(plans[ident]):
  start=max(0,marks[a]);duration=max(.4,marks[b]-start);dest=p/f'{ident}-source-{j}.mp4'
  run(['-ss',str(start),'-i',str(raw),'-t',str(duration),'-an','-vf','fps=30,setsar=1','-c:v','libx264','-threads','2','-preset','fast','-crf','18','-pix_fmt','yuv420p',str(dest)])
  parts.append(f"file '{dest}'");sourceIntervals.append({'start':start,'seconds':duration})
 join=p/f'{ident}-source.txt';join.write_text('\n'.join(parts)+'\n')
 with wave.open(str(voice)) as w:aud=w.getnframes()/w.getframerate()
 seconds=max(aud/1.02+.5,sum(i['seconds'] for i in sourceIntervals));dest=p/(ident+'.mp4')
 vf="tpad=stop_mode=clone:stop_duration=60,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Edited walkthrough · AI waits shortened':x=w-tw-22:y=18:fontsize=15:fontcolor=white:box=1:boxcolor=0x142827@0.85:boxborderw=8"
 run(['-f','concat','-safe','0','-i',str(join),'-i',str(voice),'-map','0:v','-map','1:a','-vf',vf,'-af','atempo=1.02,loudnorm=I=-16:TP=-2:LRA=8,afade=t=in:st=0:d=0.008,adelay=100|100,apad','-t',str(seconds),'-c:v','libx264','-threads','2','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ac','2','-ar','48000','-movflags','+faststart',str(dest)])
 concat.append(f"file '{dest}'");manifest['scenes'].append({**item,'startSeconds':elapsed,'seconds':seconds,'sourceIntervals':sourceIntervals});transcript += [f'## {stamp(elapsed,".")} · {item["title"]}','',''+item['voice'],'']
 words=item['voice'].split();chunks=[words[i:i+9] for i in range(0,len(words),9)];cursor=elapsed+.1
 for chunk in chunks:
  dur=aud/1.02*len(chunk)/len(words);srt += [str(cue),f'{stamp(cursor)} --> {stamp(cursor+dur)}','\n'.join(textwrap.wrap(' '.join(chunk),44)),''];cursor+=dur;cue+=1
 elapsed+=seconds;print(f'{ident}: {seconds:.1f}s',flush=True)
(p/'concat.txt').write_text('\n'.join(concat)+'\n');manifest['seconds']=elapsed;(p/'edit-manifest.json').write_text(json.dumps(manifest,indent=2));(p/'wonderbox-demo.srt').write_text('\n'.join(srt));(p/'transcript.md').write_text('\n'.join(transcript))
run(['-f','concat','-safe','0','-i',str(p/'concat.txt'),'-c','copy','-movflags','+faststart','-metadata','title=Wonderbox — Imagine it. Make it. Play it.',str(p/'wonderbox-final-demo.mp4')]);print(f'Final {elapsed:.1f}s')
