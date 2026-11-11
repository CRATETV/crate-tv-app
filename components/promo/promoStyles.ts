// Styles for the Fight Night promo template. Everything is scoped under .pp so
// it can't leak into the rest of CRATE (the admin preview renders it in-page).
// Colours and the display font come from CSS variables set from the page's Look.

export const FIGHT_NIGHT_CSS = `
.pp{--line:color-mix(in srgb,var(--ink) 9%,transparent);--dim:color-mix(in srgb,var(--ink) 55%,var(--bg));
  --body:'Inter',system-ui,sans-serif;--mono:'JetBrains Mono',ui-monospace,monospace;
  background:var(--bg);color:var(--ink);font-family:var(--body);overflow-x:clip;-webkit-font-smoothing:antialiased;position:relative;min-height:100vh}
.pp *{box-sizing:border-box;margin:0;padding:0}
.pp a{color:inherit}
.pp img,.pp video{display:block;max-width:100%}
.pp-grain{position:fixed;inset:-50%;width:200%;height:200%;pointer-events:none;z-index:90;opacity:.11;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  animation:pp-grain 1s steps(6) infinite}
@keyframes pp-grain{0%{transform:translate(0,0)}20%{transform:translate(-5%,3%)}40%{transform:translate(4%,-6%)}60%{transform:translate(-3%,5%)}80%{transform:translate(6%,2%)}100%{transform:translate(0,0)}}
.pp-grid{position:fixed;inset:0;pointer-events:none;z-index:0;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:calc(100vw/12) calc(100vw/12)}
.pp-main,.pp-foot{position:relative;z-index:1}

.pp-bar{position:fixed;top:0;left:0;right:0;z-index:60;display:flex;justify-content:space-between;align-items:center;padding:22px 32px;mix-blend-mode:difference;color:#fff}
.pp-bar .mark{font-family:var(--display);font-size:22px;letter-spacing:.06em;text-decoration:none;text-transform:uppercase}
.pp-bar .meta{font-family:var(--mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;opacity:.8}

.pp-lbx{position:fixed;left:0;right:0;height:50vh;background:#000;z-index:70;pointer-events:none;transition:transform 1.6s cubic-bezier(.7,0,.2,1) .3s}
.pp-lbx.t{top:0}.pp-lbx.b{bottom:0}
.pp.ready .pp-lbx.t{transform:translateY(-100%)}
.pp.ready .pp-lbx.b{transform:translateY(100%)}

/* hero */
.pp-hero{height:220vh;position:relative}
.pp-sticky{position:sticky;top:0;height:100vh;overflow:hidden;display:grid;place-items:center;animation:pp-flick 5s steps(1) infinite}
@keyframes pp-flick{0%,100%{filter:none}47%{filter:brightness(1.06)}48%{filter:brightness(.94)}49%{filter:none}}
.pp-sticky::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:5;background:radial-gradient(ellipse at center,transparent 45%,rgba(0,0,0,.7) 100%)}
.pp-words{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:70px 0 50px;pointer-events:none}
.pp-row{font-family:var(--display);font-size:16vw;line-height:.85;text-transform:uppercase;white-space:nowrap;color:transparent;-webkit-text-stroke:1px color-mix(in srgb,var(--ink) 14%,transparent);animation:pp-slide 40s linear infinite}
.pp-row.r2{animation-direction:reverse}
@keyframes pp-slide{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.pp-big{position:absolute;left:50%;top:50%;width:max-content;transform:translate(-50%,-50%);z-index:3;text-align:center;font-family:var(--display);font-weight:400;
  font-size:19vw;line-height:.8;text-transform:uppercase;white-space:nowrap;letter-spacing:-.01em;mix-blend-mode:difference;color:#fff;pointer-events:none;
  transition:letter-spacing 2.4s cubic-bezier(.2,.8,.2,1),opacity 1s}
.pp:not(.ready) .pp-big{letter-spacing:.3em;opacity:0}
.pp-stage{position:relative;width:min(44vw,62vh);aspect-ratio:1;z-index:2;will-change:transform}
.pp-circle{position:absolute;inset:0;border-radius:50%;overflow:hidden;background:#111;box-shadow:0 40px 120px rgba(0,0,0,.8)}
.pp-circle::after{content:"";position:absolute;inset:0;border-radius:50%;pointer-events:none;z-index:2;
  background:radial-gradient(circle at 50% 45%,transparent 38%,rgba(0,0,0,.75) 100%),linear-gradient(160deg,rgba(212,140,60,.22),rgba(20,40,80,.28));mix-blend-mode:multiply}
.pp-circle::before{content:"";position:absolute;inset:0;z-index:3;pointer-events:none;border-radius:50%;
  background:linear-gradient(115deg,transparent 40%,rgba(255,220,160,.16) 50%,transparent 60%);background-size:250% 100%;animation:pp-sweep 7s ease-in-out infinite}
@keyframes pp-sweep{0%,100%{background-position:120% 0}50%{background-position:-20% 0}}
.pp-slide{position:absolute;inset:0;opacity:0;transition:opacity 1.4s ease}
.pp-slide.on{opacity:1}
.pp-slide>img,.pp-slide>video,.pp-slide>.ph{width:100%;height:100%;object-fit:cover;transform:scale(1.15);animation:pp-drift 9s ease-in-out infinite alternate;filter:contrast(1.18) saturate(.78) brightness(.86)}
@keyframes pp-drift{from{transform:scale(1.15) translate(-2%,1%)}to{transform:scale(1.02) translate(2%,-1%)}}
.pp-slide>.ph{background:radial-gradient(circle at 30% 40%,color-mix(in srgb,var(--sideA) 60%,#000) 0,transparent 55%),radial-gradient(circle at 75% 60%,color-mix(in srgb,var(--sideB) 60%,#000) 0,transparent 55%),#0c0c0c}
.pp-flare{position:absolute;left:-60%;right:-60%;top:50%;height:2px;z-index:2;pointer-events:none;
  background:linear-gradient(90deg,transparent,rgba(140,190,255,.55) 45%,#fff 50%,rgba(140,190,255,.55) 55%,transparent 85%);filter:blur(1px);opacity:.55;animation:pp-flare 6s ease-in-out infinite}
@keyframes pp-flare{0%,100%{opacity:.25;transform:scaleX(.8)}50%{opacity:.7;transform:scaleX(1.05)}}
.pp-ringtext{position:absolute;inset:-9%;animation:pp-spin 40s linear infinite reverse}
@keyframes pp-spin{to{transform:rotate(360deg)}}
.pp-ringtext text{font-family:var(--mono);font-size:3.2px;letter-spacing:1.6px;fill:var(--dim);text-transform:uppercase}
.pp-dots{position:absolute;bottom:-11%;left:50%;transform:translateX(-50%);display:flex;gap:8px}
.pp-dots b{width:6px;height:6px;border-radius:50%;background:var(--dim);opacity:.4;transition:.3s}
.pp-dots b.on{opacity:1;background:var(--accent);width:22px;border-radius:3px}
.pp-herofoot{position:absolute;bottom:22px;left:32px;right:32px;display:flex;justify-content:space-between;gap:12px;font-family:var(--mono);font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:var(--dim);z-index:6}

/* marquee */
.pp-marquee{border-top:1px solid var(--line);border-bottom:1px solid var(--line);overflow:hidden;white-space:nowrap;padding:18px 0;background:color-mix(in srgb,var(--bg) 70%,transparent)}
.pp-marquee div{display:inline-block;animation:pp-scroll 30s linear infinite;font-family:var(--display);font-size:28px;letter-spacing:.04em;text-transform:uppercase}
.pp-marquee span{margin:0 28px}.pp-marquee .g{color:var(--accent)}
@keyframes pp-scroll{to{transform:translateX(-50%)}}

/* fighters */
.pp-fight{display:grid;grid-template-columns:1fr 1fr;position:relative;border-top:1px solid var(--line)}
.pp-fight::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:1px;z-index:4;background:linear-gradient(180deg,transparent,var(--accent),transparent);opacity:.6}
.pp-fighter{position:relative;min-height:128vh;overflow:hidden;display:flex;align-items:flex-end;padding:0 4vw 6vh}
.pp-fighter .pic{position:absolute;inset:0;background:#111 center 0/cover no-repeat;display:grid;place-items:start center;padding-top:22vh;
  filter:contrast(1.18) saturate(.78) brightness(.86);clip-path:inset(0 100% 0 0);transform:scale(1.25);transition:clip-path 1.4s cubic-bezier(.7,0,.2,1),transform 2.6s cubic-bezier(.2,.8,.2,1)}
.pp-fighter.b .pic{clip-path:inset(0 0 0 100%)}
.pp-fight.in .pic{clip-path:inset(0 0 0 0);transform:scale(1.04)}
.pp-fight.in .b .pic{transition-delay:.25s}
.pp-fighter .pic span{font-family:var(--mono);font-size:11px;letter-spacing:.3em;color:rgba(255,255,255,.35);text-transform:uppercase}
.pp-fighter.a .pic.empty{background-image:radial-gradient(ellipse at 60% 35%,color-mix(in srgb,var(--sideA) 65%,transparent),transparent 60%),linear-gradient(180deg,#160c0b,#060606)}
.pp-fighter.b .pic.empty{background-image:radial-gradient(ellipse at 40% 35%,color-mix(in srgb,var(--sideB) 65%,transparent),transparent 60%),linear-gradient(180deg,#0b0d16,#060606)}
.pp-fighter .rim{position:absolute;inset:0;z-index:1;pointer-events:none;mix-blend-mode:screen}
.pp-fighter.a .rim{background:linear-gradient(90deg,color-mix(in srgb,var(--sideA) 45%,transparent),transparent 45%),linear-gradient(200deg,rgba(255,170,80,.18),transparent 50%)}
.pp-fighter.b .rim{background:linear-gradient(270deg,color-mix(in srgb,var(--sideB) 50%,transparent),transparent 45%),linear-gradient(160deg,rgba(255,170,80,.14),transparent 50%)}
.pp-fighter::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(0deg,var(--bg) 6%,color-mix(in srgb,var(--bg) 75%,transparent) 32%,transparent 62%)}
.pp-info{position:relative;z-index:2;width:100%;max-width:440px;font-family:var(--mono);font-size:12px}
.pp-fighter.b{justify-content:flex-end}.pp-fighter.b .pp-info{text-align:right}
.pp-corner{display:inline-flex;align-items:center;gap:8px;font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--dim)}
.pp-corner i{width:10px;height:10px;border-radius:50%}
.pp-fighter.a .pp-corner i{background:var(--sideA)}.pp-fighter.b .pp-corner i{background:var(--sideB)}
.pp-fname{font-family:var(--display);font-size:clamp(70px,9vw,150px);line-height:.85;text-transform:uppercase;margin-top:12px}
.pp-fname em{display:block;font-style:normal;font-size:.4em;color:var(--dim);letter-spacing:.04em;margin-top:.2em}
.pp-nick{color:var(--accent);margin:14px 0 20px;font-size:11px;letter-spacing:.2em;text-transform:uppercase}
.pp-tape{border-top:1px solid var(--line)}
.pp-tape div{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line)}
.pp-fighter.b .pp-tape div{flex-direction:row-reverse}
.pp-tape dt{color:var(--dim);text-transform:uppercase;font-size:10px;letter-spacing:.2em}
.pp-tape dd{font-weight:700}
.pp-vsbadge{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:5;width:110px;height:110px;border-radius:50%;display:grid;place-items:center;
  background:var(--bg);border:1px solid var(--accent);color:var(--accent);font-family:var(--display);font-size:44px;box-shadow:0 0 60px color-mix(in srgb,var(--accent) 35%,transparent)}

/* sections */
.pp-sec{padding:130px 6vw}
.pp-eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.35em;text-transform:uppercase;color:var(--accent);margin-bottom:22px;display:flex;align-items:center;gap:14px}
.pp-eyebrow::before{content:"";width:34px;height:1px;background:var(--accent)}
.pp-center{text-align:center}.pp-center .pp-eyebrow{justify-content:center}
.pp h2{font-family:var(--display);font-weight:400;font-size:clamp(48px,8vw,128px);line-height:.88;text-transform:uppercase}
.pp .o{color:transparent;-webkit-text-stroke:1px var(--ink)}
.pp-lede{max-width:560px;color:var(--dim);line-height:1.6;margin-top:22px;font-size:16px}
.pp-center .pp-lede{margin-left:auto;margin-right:auto}

.pp-clock{display:flex;justify-content:center;gap:clamp(10px,3vw,48px);margin-top:40px}
.pp-clock div{min-width:clamp(70px,14vw,200px)}
.pp-clock b{display:block;font-family:var(--display);font-weight:400;font-size:clamp(64px,13vw,210px);line-height:.9;font-variant-numeric:tabular-nums}
.pp-clock span{font-family:var(--mono);font-size:11px;letter-spacing:.3em;color:var(--dim);text-transform:uppercase}
.pp-clock .sep{min-width:0;font-family:var(--display);font-size:clamp(50px,10vw,160px);color:var(--accent);opacity:.6}
.pp-notify{margin:56px auto 0;display:flex;max-width:520px;border:1px solid color-mix(in srgb,var(--ink) 25%,transparent);border-radius:999px;overflow:hidden}
.pp-notify input{flex:1;min-width:0;background:transparent;border:0;color:var(--ink);padding:18px 24px;font:inherit;font-size:15px;outline:none}
.pp-notify button,.pp-btn{background:var(--ink);color:var(--bg);border:0;padding:0 28px;font-family:var(--mono);font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;cursor:pointer;transition:background .2s}
.pp-notify button:hover,.pp-btn:hover{background:var(--accent)}
.pp-notify button:disabled{opacity:.5}
.pp-btn{display:inline-flex;align-items:center;padding:18px 28px;border-radius:999px;text-decoration:none}
.pp-ok{margin-top:16px;font-family:var(--mono);font-size:12px;color:var(--accent);letter-spacing:.1em;min-height:1em}

.pp-tiers{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-top:60px}
.pp-tier{border:1px solid var(--line);border-radius:22px;padding:26px 22px;background:color-mix(in srgb,var(--ink) 3%,var(--bg))}
.pp-tier b{font-family:var(--display);font-weight:400;font-size:52px;display:block}
.pp-tier h4{font-family:var(--mono);font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:var(--accent);margin:6px 0 14px}
.pp-tier p{font-size:14px;color:var(--dim);line-height:1.5}

.pp-vs{display:grid;grid-template-columns:1fr auto 1fr;gap:3vw;align-items:center;max-width:1000px;margin:60px auto 0}
.pp-side{border:1px solid var(--line);border-radius:999px;aspect-ratio:1;display:grid;place-items:center;cursor:pointer;transition:.3s;background:#0c0c0c;position:relative;overflow:hidden;color:#fff}
.pp-side::before{content:"";position:absolute;inset:0;background:var(--img) center 35%/cover;filter:grayscale(1) contrast(1.2) brightness(.45);transition:.5s}
.pp-side:hover::before,.pp-side.chosen::before{filter:grayscale(.2) contrast(1.15) brightness(.6)}
.pp-side>div{position:relative}
.pp-side h3{font-family:var(--display);font-weight:400;font-size:clamp(40px,6vw,90px);line-height:.9;text-transform:uppercase}
.pp-side span{font-family:var(--mono);font-size:10px;letter-spacing:.3em;color:rgba(255,255,255,.6);text-transform:uppercase}
.pp-side.a:hover,.pp-side.a.chosen{border-color:var(--sideA);box-shadow:inset 0 0 80px color-mix(in srgb,var(--sideA) 35%,transparent)}
.pp-side.b:hover,.pp-side.b.chosen{border-color:var(--sideB);box-shadow:inset 0 0 80px color-mix(in srgb,var(--sideB) 35%,transparent)}
.pp-vsmid{font-family:var(--display);font-size:clamp(30px,4vw,60px);color:var(--accent)}
.pp-meter{max-width:1000px;margin:50px auto 0;height:10px;border-radius:99px;overflow:hidden;display:flex;background:color-mix(in srgb,var(--ink) 10%,var(--bg))}
.pp-meter i{display:block;height:100%;transition:width 1s cubic-bezier(.2,.8,.2,1)}
.pp-meterl{max-width:1000px;margin:12px auto 0;display:flex;justify-content:space-between;font-family:var(--mono);font-size:12px;letter-spacing:.15em;text-transform:uppercase}

.pp-slots{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;background:var(--line);border:1px solid var(--line);margin-top:60px}
.pp-slot{background:var(--bg);aspect-ratio:16/9;display:grid;place-items:center;font-family:var(--mono);font-size:10px;letter-spacing:.25em;color:color-mix(in srgb,var(--ink) 25%,var(--bg));text-transform:uppercase;padding:16%;text-decoration:none}
.pp-slot img{max-height:100%;max-width:100%;object-fit:contain;filter:grayscale(1) brightness(1.4);opacity:.85;transition:.3s}
.pp-slot:hover img{filter:none;opacity:1}
.pp-pcta{display:flex;flex-wrap:wrap;gap:30px;justify-content:space-between;align-items:end;margin-top:40px}

.pp-ig{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;margin-top:60px;align-items:start}
.pp-ig .instagram-media{min-width:0!important;width:100%!important;margin:0!important;border-radius:18px!important}

.pp-lb{position:fixed;inset:0;z-index:85;background:rgba(0,0,0,.92);display:grid;place-items:center;padding:5vw}
.pp-lb .box{width:min(1100px,100%);aspect-ratio:16/9;background:#111}
.pp-lb .box video{width:100%;height:100%}
.pp-lb .close{position:absolute;top:22px;right:32px;background:none;border:0;color:#fff;font-family:var(--mono);letter-spacing:.2em;cursor:pointer}

.pp-foot{border-top:1px solid var(--line);padding:80px 6vw 36px;color:var(--dim);font-size:14px}
.pp-footmark{font-family:var(--display);text-transform:uppercase;color:var(--ink);font-size:clamp(64px,15vw,240px);line-height:.82;letter-spacing:-.01em;text-align:center;white-space:nowrap;overflow:hidden;padding-bottom:60px;border-bottom:1px solid var(--line)}
.pp-footrow{display:grid;grid-template-columns:2fr 1fr 1fr;gap:40px;padding:44px 0}
.pp-footrow p{line-height:1.7}
.pp-footcol h5{font-family:var(--mono);font-size:10px;letter-spacing:.3em;color:var(--ink);margin-bottom:14px;font-weight:400;text-transform:uppercase}
.pp-footcol a{display:block;text-decoration:none;margin:6px 0;transition:color .2s}
.pp-footcol a:hover{color:var(--accent)}
.pp-fine{display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;font-family:var(--mono);font-size:11px;letter-spacing:.1em;border-top:1px solid var(--line);padding-top:24px}
.pp-fine a{color:var(--ink);text-decoration:none}

.pp .rv{opacity:0;transform:translateY(40px);transition:1s cubic-bezier(.2,.8,.2,1)}
.pp .rv.in{opacity:1;transform:none}
.pp.no-grain .pp-grain,.pp.no-flare .pp-flare,.pp.no-letterbox .pp-lbx{display:none}

/* partners page */
.pp-phero{min-height:100vh;display:grid;grid-template-columns:1.1fr .9fr;align-items:center;gap:5vw;padding:120px 6vw 80px}
.pp h1{font-family:var(--display);font-weight:400;font-size:clamp(64px,9vw,150px);line-height:.86;text-transform:uppercase}
.pp-duo{position:relative;aspect-ratio:1;width:100%;max-width:560px;justify-self:center}
.pp-duo .c{position:absolute;width:62%;aspect-ratio:1;border-radius:50%;overflow:hidden;box-shadow:0 30px 100px rgba(0,0,0,.8);background:#141414 center/cover}
.pp-duo .c{filter:contrast(1.18) saturate(.75) brightness(.85)}
.pp-duo .a{left:0;top:0;outline:1px solid color-mix(in srgb,var(--sideA) 60%,transparent);outline-offset:8px}
.pp-duo .b{right:0;bottom:0;outline:1px solid color-mix(in srgb,var(--sideB) 60%,transparent);outline-offset:8px}
.pp-duo .vs{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:3;width:84px;height:84px;border-radius:50%;background:var(--bg);border:1px solid var(--accent);color:var(--accent);display:grid;place-items:center;font-family:var(--display);font-size:34px}
.pp-psec{padding:120px 6vw;border-top:1px solid var(--line)}
.pp-num{font-family:var(--mono);font-size:12px;color:var(--dim);letter-spacing:.2em;margin-bottom:16px}
.pp-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);margin-top:60px}
.pp-step{background:var(--bg);padding:28px 22px 32px;min-height:240px}
.pp-step .when{font-family:var(--mono);font-size:11px;letter-spacing:.2em;color:var(--accent);text-transform:uppercase}
.pp-step h3{font-family:var(--display);font-weight:400;font-size:30px;line-height:1;text-transform:uppercase;margin:18px 0 12px}
.pp-step p{color:var(--dim);font-size:14px;line-height:1.5}
.pp-step.key{background:color-mix(in srgb,var(--accent) 7%,var(--bg))}.pp-step.key h3{color:var(--accent)}
.pp-places{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:60px}
.pp-place{border:1px solid var(--line);border-radius:22px;padding:28px;background:color-mix(in srgb,var(--ink) 3%,var(--bg))}
.pp-place .ico{width:46px;height:46px;border-radius:50%;border:1px solid var(--accent);display:grid;place-items:center;color:var(--accent);font-family:var(--mono);font-size:13px;margin-bottom:22px}
.pp-place h3{font-size:18px;margin-bottom:8px}.pp-place p{color:var(--dim);font-size:14px;line-height:1.5}
.pp-packs{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin-top:60px}
.pp-pack{border:1px solid var(--line);border-radius:26px;padding:32px 26px;background:color-mix(in srgb,var(--ink) 3%,var(--bg));display:flex;flex-direction:column}
.pp-pack.top{border-color:var(--accent);background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 9%,var(--bg)),var(--bg))}
.pp-pack .tag{font-family:var(--mono);font-size:10px;letter-spacing:.25em;text-transform:uppercase;color:var(--accent);min-height:14px}
.pp-pack h3{font-family:var(--display);font-weight:400;font-size:34px;text-transform:uppercase;line-height:1;margin:14px 0 6px}
.pp-pack .price{font-family:var(--display);font-size:56px;line-height:1;margin:10px 0 4px}
.pp-pack .spots{font-family:var(--mono);font-size:11px;color:var(--dim);letter-spacing:.1em;margin-bottom:22px}
.pp-pack ul{list-style:none;border-top:1px solid var(--line);flex:1}
.pp-pack li{padding:11px 0;border-bottom:1px solid var(--line);font-size:14px;display:flex;gap:10px;line-height:1.4}
.pp-pack li::before{content:"✦";color:var(--accent);font-size:10px;margin-top:4px}
.pp-team{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border:1px solid var(--line);margin-top:60px}
.pp-person{background:var(--bg);padding:26px;display:flex;gap:18px;align-items:center}
.pp-person .ph{width:84px;height:84px;flex:none;border-radius:50%;border:1px solid var(--line);background:color-mix(in srgb,var(--ink) 6%,var(--bg)) center/cover;display:grid;place-items:center;font-family:var(--mono);font-size:9px;letter-spacing:.2em;color:var(--dim)}
.pp-person .role{font-family:var(--mono);font-size:10px;letter-spacing:.25em;color:var(--accent);text-transform:uppercase}
.pp-person h3{font-size:18px;margin:6px 0}.pp-person p{color:var(--dim);font-size:14px}
.pp-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);margin-top:60px}
.pp-stat{background:var(--bg);padding:34px 26px}
.pp-stat b{display:block;font-family:var(--display);font-weight:400;font-size:clamp(54px,6vw,92px);line-height:1}
.pp-stat span{font-family:var(--mono);font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--dim)}
.pp-stat small{display:block;margin-top:10px;color:var(--dim);font-size:13px}

@media (hover:none){.pp-cursor{display:none}}
@media (max-width:900px){
  .pp-bar{padding:18px 20px}.pp-bar .meta{display:none}
  .pp-stage{width:72vw}.pp-row{font-size:28vw}
  .pp-herofoot{left:20px;right:20px;font-size:9px;letter-spacing:.15em}.pp-herofoot .mid{display:none}
  .pp-fight{grid-template-columns:1fr}.pp-fight::before{display:none}
  .pp-fighter{min-height:100vh;padding:0 20px 40px}.pp-fighter .pic{background-position:center 8%}
  .pp-vsbadge{width:80px;height:80px;font-size:32px}
  .pp-sec,.pp-psec{padding:90px 20px}
  .pp-clock{gap:6px}.pp-clock div{min-width:0}.pp-clock b{font-size:15vw}.pp-clock .sep{font-size:10vw}
  .pp-notify button{padding:0 16px}
  .pp-vs{gap:10px}
  .pp-slots{grid-template-columns:repeat(2,1fr)}
  .pp-footrow{grid-template-columns:1fr 1fr}.pp-footrow p{grid-column:1/-1}.pp-footmark{font-size:17vw}
  .pp-phero{grid-template-columns:1fr;padding:110px 20px 60px}.pp-duo{max-width:400px}
  .pp-places{grid-template-columns:1fr}.pp-team{grid-template-columns:1fr}
}
`;
