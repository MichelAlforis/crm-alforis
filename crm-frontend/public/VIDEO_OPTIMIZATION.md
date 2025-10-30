# Video Optimization Guide

## Results
- **Original**: 7.0MB (Video_auth.mp4)
- **MP4 Optimized**: 1.0MB (Video_auth_optimized.mp4) - 86% reduction
- **WebM Optimized**: 705KB (Video_auth_optimized.webm) - 90% reduction ✅

## Commands Used

### MP4 Optimization (H.264)
```bash
ffmpeg -i Video_auth.mp4 \
  -vf "scale=1280:-2" \
  -c:v libx264 \
  -crf 28 \
  -preset slow \
  -profile:v baseline \
  -level 3.0 \
  -movflags +faststart \
  -an \
  Video_auth_optimized.mp4 -y
```

**Parameters:**
- `scale=1280:-2`: Resize to 1280px width, maintain aspect ratio
- `crf 28`: Constant Rate Factor (0-51, 23=default, higher=smaller)
- `preset slow`: Better compression (veryslow/slow/medium/fast)
- `profile:v baseline`: Max compatibility
- `movflags +faststart`: Optimize for web streaming
- `-an`: Remove audio

### WebM Optimization (VP9)
```bash
ffmpeg -i Video_auth.mp4 \
  -vf "scale=1280:-2" \
  -c:v libvpx-vp9 \
  -crf 40 \
  -b:v 0 \
  -deadline good \
  -cpu-used 4 \
  -row-mt 1 \
  -an \
  Video_auth_optimized.webm -y
```

**Parameters:**
- `libvpx-vp9`: VP9 codec (better compression than VP8)
- `crf 40`: Quality (0-63, 31=default, higher=smaller)
- `b:v 0`: Enable constant quality mode
- `deadline good`: Balance speed/quality (best/good/realtime)
- `cpu-used 4`: Speed preset (0-5, higher=faster but less efficient)
- `row-mt 1`: Enable row-based multithreading

## Implementation

### HTML Video Element
```tsx
<video
  autoPlay
  loop
  muted
  playsInline
  preload="auto"
  className="w-full h-full object-cover opacity-50"
  style={{ willChange: 'auto' }}
>
  {/* WebM for modern browsers (90% smaller) */}
  <source src="/Video_auth_optimized.webm" type="video/webm" />
  {/* MP4 fallback */}
  <source src="/Video_auth_optimized.mp4" type="video/mp4" />
</video>
```

## Lighthouse Best Practices

1. **Use WebM first**: Modern browsers support it, 30% smaller than H.264
2. **Provide MP4 fallback**: Safari and older browsers
3. **Remove audio**: Background videos don't need sound (`-an`)
4. **Enable streaming**: Use `movflags +faststart` for MP4
5. **Optimize dimensions**: 1280px is sufficient for background videos
6. **Set preload**: Use `preload="auto"` for above-fold videos
7. **Add poster image**: (optional) For initial frame before load
8. **Use opacity**: Reduce visual weight (opacity-50)

## Size Guidelines for Lighthouse

- ✅ **< 1MB**: Excellent (Green score)
- ⚠️ **1-3MB**: Acceptable (Orange score)
- ❌ **> 3MB**: Poor (Red score)

Current implementation: **705KB (WebM)** ✅

## Future Optimizations

1. **Lazy loading**: Load video only when visible
   ```tsx
   <video loading="lazy" ...>
   ```

2. **Intersection Observer**: Start playing when in viewport
   ```tsx
   const videoRef = useRef(null)
   useEffect(() => {
     const observer = new IntersectionObserver(entries => {
       entries.forEach(entry => {
         if (entry.isIntersecting) {
           videoRef.current?.play()
         } else {
           videoRef.current?.pause()
         }
       })
     })
     if (videoRef.current) observer.observe(videoRef.current)
   }, [])
   ```

3. **Poster image**: Show static frame while loading
   ```tsx
   <video poster="/video-poster.jpg" ...>
   ```

4. **Adaptive quality**: Serve different sizes based on screen size
   ```tsx
   <source
     src="/video_mobile.webm"
     type="video/webm"
     media="(max-width: 768px)"
   />
   ```

## References

- FFmpeg Documentation: https://ffmpeg.org/documentation.html
- WebM Best Practices: https://www.webmproject.org/docs/
- Lighthouse Performance: https://web.dev/optimize-lcp/
