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

const levelConditionList = [
  /Students must be in level ([1-5][AB])( or higher)?/,
  /Not open to(.*) students in level ([1-5][AB])( or [1-5][AB])?( or higher)?/,
];

export function singleRequirementStatus(
  courseInfo: Requirement,
  termId: number, // e.g. 1255
  termName: string, //e.g. 1A
  courseMap: Map<string, number[]>, // courseCode: termId
  status: Requirement['conditionStatus'],
) {
  if (courseInfo.conditionedOn == 'final') {
    let decision = true;
    for (const link of courseInfo.relatedLinks) {
      // Checking courses
      if (link.linkType == 'courses' || link.linkType == 'course') {
        if (courseMap.has(link.value.toLowerCase())) {
          switch (status) {
            case 'none':
            case 'complete':
              decision =
                decision && courseMap.get(link.value.toLowerCase())!.some((term) => term < termId);
              break;
            case 'currently_enrolled':
              decision =
                decision &&
                courseMap.get(link.value.toLowerCase())!.some((term) => term === termId);
              break;
            case 'both':
              decision =
                decision && courseMap.get(link.value.toLowerCase())!.some((term) => term <= termId);
              break;
          }
        } else {
          decision = false;
        }
        // checking programs
      } else if (link.linkType == 'programs') {
        //TODO: complete
      }
    }
    // checking year requirements
    for (const levelCondition of levelConditionList) {
      const match = courseInfo.conditionText.match(levelCondition);
      if (match) {
        const semesters = courseInfo.conditionText.match(/([1-5][AB])/g) || [];
        let isEnroled =
          semesters.filter((sem) => sem.toLowerCase() == termName.toLowerCase()).length != 0;
        if (courseInfo.conditionText.includes(' or higher')) {
          const biggestSem = semesters.reduceRight((prev, curr) => (prev > curr ? prev : curr), '');
          isEnroled = termName >= biggestSem;
        }
        decision = decision && isEnroled;
      }
    }
  }

  return false;
}

export function totalRequirementStatus(
  courseInfo: GQLCoursePreReq['courseInfo'],
  termId: number, // e.g. 1255
  termName: string, //e.g. 1A
  courseMap: Map<string, number[]>, // courseCode: termId
): boolean {
  let finalResult = true;
  if (courseInfo.prerequisites) {
    finalResult =
      finalResult &&
      singleRequirementStatus(courseInfo.prerequisites, termId, termName, courseMap, 'none');
  }
  if (courseInfo.antirequisites) {
    finalResult =
      finalResult &&
      singleRequirementStatus(courseInfo.antirequisites, termId, termName, courseMap, 'none');
  }
  if (courseInfo.corequisites) {
    finalResult =
      finalResult &&
      singleRequirementStatus(courseInfo.corequisites, termId, termName, courseMap, 'none');
  }
  return finalResult;
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
