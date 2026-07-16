import sys, os, subprocess, json
FF='/home/lzn/ffmpeg/ffmpeg-6.0-amd64-static/ffmpeg'
FP='/home/lzn/ffmpeg/ffmpeg-6.0-amd64-static/ffprobe'
def dur(p):
    try:
        r=subprocess.run([FP,'-v','error','-show_entries','format=duration','-of','default=nk=1:nw=1',p],capture_output=True,text=True)
        return float(r.stdout.strip())
    except: return 3.0
def strip(vpath, out, label, n=6, fw=240, fh=150):
    d=dur(vpath); ts=[max(0.05,d*(i+0.5)/n) for i in range(n)]
    tmp=[]
    for i,t in enumerate(ts):
        o=f'{out}.f{i}.jpg'
        subprocess.run([FF,'-y','-loglevel','error','-ss',f'{t:.2f}','-i',vpath,'-vframes','1','-vf',f'scale={fw}:{fh}:force_original_aspect_ratio=increase,crop={fw}:{fh}',o],capture_output=True)
        tmp.append(o)
    inp=[]
    for f in tmp: inp+=['-i',f]
    fc=''.join(f'[{i}:v]' for i in range(n))+f'hstack=inputs={n}[s];[s]drawtext=text=\'{label}\':x=6:y=6:fontsize=20:fontcolor=yellow:box=1:boxcolor=black@0.65[o]'
    subprocess.run([FF,'-y','-loglevel','error',*inp,'-filter_complex',fc,'-map','[o]',out],capture_output=True)
    for f in tmp:
        try: os.remove(f)
        except: pass
    return out
def sheet(rows, outsheet):
    inp=[]
    for r in rows: inp+=['-i',r]
    n=len(rows)
    fc=''.join(f'[{i}:v]' for i in range(n))+f'vstack=inputs={n}[o]'
    subprocess.run([FF,'-y','-loglevel','error',*inp,'-filter_complex',fc,'-map','[o]',outsheet],capture_output=True)
if __name__=='__main__':
    items=json.load(open(sys.argv[1]))  # [[label, path], ...]
    outdir=sys.argv[2]; os.makedirs(outdir,exist_ok=True)
    rows=[]
    for i,(lab,p) in enumerate(items):
        if not os.path.exists(p): 
            print('missing',p); continue
        rows.append(strip(p, f'{outdir}/row{i:02d}.jpg', lab))
    # chunk into sheets of 8 rows
    for c in range(0,len(rows),8):
        sheet(rows[c:c+8], f'{outdir}/sheet_{c//8}.png')
    print('rows',len(rows),'sheets',(len(rows)+7)//8)
