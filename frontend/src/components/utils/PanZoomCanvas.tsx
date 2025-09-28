'use client';
import { useRef, useState, useEffect } from "react"

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(v, hi)) }

export default function PanZoomCanvas() {
    // container and content ref
    const containerRef = useRef<HTMLDivElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);

    // content style values
    interface viewInterface {tx: number, ty:number, scale:number}
    const [view, setView] = useState<viewInterface>({tx:0, ty:0, scale:1})
    const viewRef = useRef<viewInterface>(view);
    useEffect(() => { viewRef.current = view }, [view])

    // constants
    const MIN_SCALE = 0.25;
    const MAX_SCALE = 4;
    const ZOOM_STEP = 1.15;

    // panning refs:
    const isPanningRef = useRef<boolean>(false)
    const lastPanRef = useRef({ x: 0, y: 0 })

    // pinching refs
    const activePointers = useRef(new Map<number, { x: number, y: number }>())
    const pinchRef = useRef<{
        startDistance: number;
        startScale: number;
        startMid: { x: number; y: number };
        startTx: number;
        startTy: number;
    } | null>(null);

    function zoomAt(clientX: number, clientY: number, newScale: number) {
        const container = containerRef.current!;
        if (!container) return;

        newScale = clamp(newScale, MIN_SCALE, MAX_SCALE);
        const rect = container.getBoundingClientRect();

        // Point in client coordinates relative to container
        const cx = clientX - rect.left;
        const cy = clientY - rect.top;

        // Adjust translate so (cx,cy) remains stable under the new scale
        // Derivation: screen = T + S * world; keeping screen fixed ⇒
        // T' = (cx,cy) - newS/oldS * ((cx,cy) - T)
        setView((prev)=> {
            const k = newScale / prev.scale;
            const newTx = cx - k * (cx - prev.tx);
            const newTy = cy - k * (cy - prev.ty);
            return {scale: newScale, tx: newTx, ty: newTy}
        })
    }

    function fitToView() {
        const container = containerRef.current;
        const content = contentRef.current;
        if (!container || !content) return;

        const cRect = container.getBoundingClientRect()
        const worldW = content.offsetWidth;
        const worldH = content.offsetHeight;
        const pad = 48;

        const scaleX = (cRect.width - pad * 2) / worldW;
        const scaleY = (cRect.height - pad * 2) / worldH;
        const newScale = clamp(Math.min(scaleX, scaleY), MIN_SCALE, MAX_SCALE)

        const newTx = (cRect.width - worldW * newScale) / 2;
        const newTy = (cRect.height - worldH * newScale) / 2;

        setView({scale:newScale, tx:newTx, ty:newTy})
    }

    useEffect(() => {
        const el = containerRef.current!;
        if (el) el.style.cursor = "grab";
        const id = requestAnimationFrame(() => fitToView())
        return () => cancelAnimationFrame(id);
    }, [])

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const { clientX, clientY, deltaY, deltaX, ctrlKey, metaKey } = e;

            if (!(ctrlKey || metaKey)) {
                // Zoom: trackpad pinch or ctrl/cmd + wheel
                const direction = deltaY < 0 ? 1 : -1; // up = zoom in
                const factor = direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
                zoomAt(clientX, clientY, viewRef.current.scale * factor);
            } else {
                const speed = 1;
                const dx = e.shiftKey ? deltaY : deltaX;
                const dy = e.shiftKey ? 0 : deltaY;
                setView((prev)=> {
                    const tx = prev.tx - dx * speed;
                    const ty = prev.ty - dy * speed;
                    return {...prev, tx, ty}
                })
            }
        }

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel as EventListener)
    }, [])


    function onPointerDown(e: React.PointerEvent) {
        const el = containerRef.current!;
        (e.target as Element).setPointerCapture(e.pointerId);

        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

        if (activePointers.current.size == 2) {
            const pts = Array.from(activePointers.current.values())
            const dx = pts[0].x - pts[1].x;
            const dy = pts[0].y - pts[1].y;
            const dist = Math.hypot(dx, dy);
            const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[1].y + pts[1].y) / 2 }

            pinchRef.current = {
                startDistance: dist,
                startMid: mid,
                startScale: view.scale,
                startTx: view.tx,
                startTy: view.ty
            }
        } else {
            isPanningRef.current = true;
            lastPanRef.current = { x: e.clientX, y: e.clientY };
            el.style.cursor = "grabbing";
        }
    }

    function onPointerMove(e: React.PointerEvent) {
        if (activePointers.current.has(e.pointerId)) {
            activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }

        if (pinchRef.current && activePointers.current.size >= 2) {
            const pts = Array.from(activePointers.current.values());
            const dx = pts[0].x - pts[1].x;
            const dy = pts[0].y - pts[1].y;
            const dist = Math.hypot(dx, dy)
            const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[1].y + pts[1].y) / 2 }

            const pinch = pinchRef.current;
            const newScale = clamp((dist / pinch.startDistance) * pinch.startScale, MIN_SCALE, MAX_SCALE);

            const container = containerRef.current!;
            const rect = container.getBoundingClientRect();
            const cx = mid.x - rect.left;
            const cy = mid.y - rect.top;

            const kk = newScale / pinch.startScale;
            const newTx = cx - kk * (cx - pinch.startTx);
            const newTy = cy - kk * (cy - pinch.startTy);

            setView({scale:newScale, tx:newTx, ty:newTy});
            return;
        }

        if (isPanningRef.current) {
            const newTx = e.clientX - lastPanRef.current.x + view.tx;
            const newTy = e.clientY - lastPanRef.current.y + view.ty;
            lastPanRef.current = { x: e.clientX, y: e.clientY };
            setView((prev)=>({...prev, tx:newTx, ty:newTy}))
        }
    }

    function onPointerUp(e: React.PointerEvent) {
        (e.target as Element).releasePointerCapture(e.pointerId)
        activePointers.current.delete(e.pointerId);

        if (activePointers.current.size < 2) {
            pinchRef.current = null;
        }

        if (activePointers.current.size == 0) {
            isPanningRef.current = false;
            const el = containerRef.current!;
            el.style.cursor = "grab";
        }
    }


    return (
        <div className="fixed top-0 left-0 w-screen h-screen">
            <div
                ref={containerRef}
                // onDoubleClick={onDoubleClick}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{ touchAction: 'none' }}
                className="relative overflow-hidden bg-amber-700 w-screen h-screen"
            >
                {/* Background Image */}
                <div className="absolute inset-0" aria-hidden>
                    <div
                        className="w-full h-full opacity-60"
                        style={{
                            backgroundImage:
                                "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 40px)",
                            backgroundSize: "40px 40px",
                            backgroundPosition: `${view.tx % 40}px ${view.ty % 40}px`, // parallax grid
                        }}
                    />
                </div>

                <div
                    ref={contentRef}
                    className="absolute top-0 left-0 will-change-transform bg-dark-green text-light-green border-1"
                    style={{
                        transformOrigin: "0 0",
                        transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
                    }}
                >
                    <div className="px-50 py-20">
                        Class - Imma touch u
                    </div>
                </div>
            </div>
        </div>
    )
}
