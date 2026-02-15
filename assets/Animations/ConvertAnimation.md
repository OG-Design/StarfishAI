# Convert animation to gif
```bash
ffmpeg -i LoadingDroplet.mp4 -vf "scale=1024:-2:flags=lanczos,colorkey=0x000000:0.05:0.0,format=rgba,split[a][b];[a]palettegen=reserve_transparent=1:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a" -gifflags +transdiff -y LoadingDroplet.gif
```

# Convert to apng 
```bash
# Non looping, stops at last frame
ffmpeg -i ArrowToStop.mp4 -vf "scale=1024:-2:flags=lanczos,colorkey=0x000000:0.05:0.0,format=rgba" -plays 1 -y ArrowToStop.apng
# Reversed, stops at first frame
ffmpeg -i ArrowToStop.mp4 -vf "reverse,scale=1024:-2:flags=lanczos,colorkey=0x000000:0.05:0.0,format=rgba" -plays 1 -f apng -y StopToArrow.apng
# 'Poster' the first frame
ffmpeg -i ArrowToStop.mp4 -vf "select=eq(n\,0),colorkey=0x000000:0.05:0.0,format=rgba" -frames:v 1 -update 1 ArrowToStop-poster.png
```