import Graph from "@/components/graph/Graph";
import PanZoomCanvas from "@/components/utils/PanZoomCanvas";

export default function GraphPage() {
    return (
        <PanZoomCanvas>
            <Graph />
        </PanZoomCanvas>
    );
}
