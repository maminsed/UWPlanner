import { ClassLocations, GQLCoursePreReq, LineType, Requirement } from '../interface';

// This function takes an array of course information and extracts prerequisite relationships.
// It returns an array of pairs where each pair represents a prerequisite relationship
// in the form [prerequisite_id, course_id].
export function preReq(courseInformations: GQLCoursePreReq[], courseDict: Map<number, string>) {
  const preReqs: [number, number][] = [];
  const courseDictInverted: Map<string, number> = new Map(
    courseDict.entries().map(([k, v]) => [v, k]),
  );
  let currId: number;
  function recursiveLoading(req: Requirement) {
    if (req.conditionedOn == 'final' || req.conditionedOn == 'unclassified') {
      req.relatedLinks.forEach((link) => {
        if (link.linkType == 'courses' && courseDictInverted.has(link.value.toLowerCase())) {
          preReqs.push([courseDictInverted.get(link.value.toLowerCase())!, currId]);
        }
      });
      return;
    }
    req.appliesTo.forEach((req) => recursiveLoading(req));
  }

  for (const ci of courseInformations) {
    currId = courseDictInverted.get(ci.code)!;
    if (ci.courseInfo.prerequisites) recursiveLoading(ci.courseInfo.prerequisites);
  }
  return preReqs;
}

// This function generates connection lines between courses and their prerequisites.
// It takes a prerequisite graph and course locations as input and returns an array of line segments.
export function generateConnectionLines(
  courseReqGraph: [number, number][],
  locations: ClassLocations,
) {
  const res: LineType[] = [];
  for (const [preReqCourseId, courseId] of courseReqGraph) {
    const preReqLocations = locations.get(preReqCourseId); // Get locations of the prerequisite course.
    const courseLocations = locations.get(courseId); // Get locations of the current course.
    if (preReqLocations && courseLocations) {
      for (const [termId, courseLoc] of courseLocations.entries()) {
        // Find the rightmost prerequisite term that is earlier than the current term.
        const rightMostPreReqTermId = preReqLocations
          .keys()
          .reduce((best, cur) => (cur > best && termId > cur ? cur : best));
        if (rightMostPreReqTermId < termId) {
          const rightMostPreReq = preReqLocations.get(rightMostPreReqTermId)!;
          // Add a line segment connecting the prerequisite to the course.
          res.push({
            startLoc: {
              x: rightMostPreReq.left + rightMostPreReq.width,
              y: rightMostPreReq.top + rightMostPreReq.height / 2,
            },
            endLoc: {
              x: courseLoc.left,
              y: courseLoc.top + courseLoc.height / 2,
            },
            startCourse: {
              courseId: preReqCourseId,
              termId: rightMostPreReqTermId,
            },
            endCourse: {
              courseId: courseId,
              termId,
            },
          });
        }
      }
    }
  }
  return res;
}
