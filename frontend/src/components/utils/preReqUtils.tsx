import { ClassLocations, gqlCourseSection, Pair } from "../interface";

// This function takes an array of course information and extracts prerequisite relationships.
// It returns an array of pairs where each pair represents a prerequisite relationship
// in the form [prerequisite_id, course_id].
export function preReq(courseInformations: gqlCourseSection[]) {
    const res: [number, number][] = [];
    for (const ci of courseInformations) {
        for (const pq of ci.prerequisites) {
            if (!pq.is_corequisite) { // Only include prerequisites, not corequisites.
                res.push([pq.prerequisite_id, ci.id]);
            }
        }
    }
    return res;
}

// This function generates connection lines between courses and their prerequisites.
// It takes a prerequisite graph and course locations as input and returns an array of line segments.
// Each line segment is represented as a pair of points ([Pair, Pair]) that define the start and end of the line.
export function generateConnectionLines(courseReqGraph: [number, number][], locations: ClassLocations) {
    const res: [Pair, Pair][] = [];
    for (const [preReq, course] of courseReqGraph) {
        const preReqLocations = locations.get(preReq); // Get locations of the prerequisite course.
        const courseLocations = locations.get(course); // Get locations of the current course.
        if (preReqLocations && courseLocations) {
            for (const [termId, course] of courseLocations.entries()) {
                // Find the rightmost prerequisite term that is earlier than the current term.
                const rightMostPreReqTermId = preReqLocations.keys().reduce((best, cur) => cur > best && termId > cur ? cur : best);
                if (rightMostPreReqTermId < termId) {
                    const rightMostPreReq = preReqLocations.get(rightMostPreReqTermId)!;
                    // Add a line segment connecting the prerequisite to the course.
                    res.push([{
                        x: rightMostPreReq.left + rightMostPreReq.width,
                        y: rightMostPreReq.top + rightMostPreReq.height / 2,
                    }, {
                        x: course.left,
                        y: course.top + course.height / 2,
                    }]);
                }
            }
        }
    }
    return res;
}
