Maku sprite frames
==================

Drop your frame-by-frame PNGs here, one folder per sprite:

  stand/  -> sprite 1 (standing, arms down)   used for: idle, talking, thinking, waving
  sit/    -> sprite 2 (sitting, arms up)       used for: sitting, reading (home screen)
  rest/   -> sprite 3 (sprawled / lying)       used for: happy, writing (success moments)

Name frames sequentially: 1.png, 2.png, 3.png, ...

Then tell Claude "frames are in" and it will regenerate manifest.json
(the app reads that to know how many frames each sprite has).

Until frames are added, the app falls back to the built-in SVG Maku.
