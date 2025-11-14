import { AllCourseInformation } from '../graph/CourseClass';
import { BKCourseInfo, LineType, Requirement } from '../interface';

// It returns an array of pairs where each pair represents a prerequisite relationship
// in the form [prerequisite_id, course_id].
export function preReq(allCourses: AllCourseInformation) {
  const preReqs: [number, number][] = [];
  let currId: number;
  function recursiveLoading(req: Requirement) {
    if (req.conditionedOn == 'final' || req.conditionedOn == 'unclassified') {
      req.relatedLinks.forEach((link) => {
        if (link.linkType == 'courses') {
          const courseInfo = allCourses.getCourseInfoCode(link.value.toLowerCase());
          if (courseInfo) {
            preReqs.push([courseInfo.id, currId]);
          }
        }
      });
      return;
    }
    req.appliesTo.forEach((req) => recursiveLoading(req));
  }

  for (const cid of allCourses.courseIds) {
    currId = cid;
    const course = allCourses.getCourseInfoId(cid)!;
    if (course.courseInfo.prerequisites) recursiveLoading(course.courseInfo.prerequisites);
  }
  return preReqs;
}

const levelConditionList = [
  /Students must be in level ([1-5][AB])( or higher)?/,
  /Not open to(.*) students in level ([1-5][AB])( or [1-5][AB])?( or higher)?/,
];

export function totalRequirementStatus(
  courseInfo: BKCourseInfo['courseInfo'],
  termId: number, // e.g. 1255
  allCourses: AllCourseInformation,
): boolean {
  function singleRequirementStatus(
    courseInfo: Requirement,
    status: Requirement['conditionStatus'],
  ) {
    if (courseInfo.conditionedOn == 'final' || courseInfo.conditionedOn == 'unclassified') {
      let decision = true;
      for (const link of courseInfo.relatedLinks) {
        // Checking courses
        if (link.linkType == 'courses' || link.linkType == 'course') {
          const course = allCourses.getCourseInfoCode(link.value.toLowerCase());
          if (course) {
            switch (status) {
              case 'none':
              case 'complete':
                decision = decision && [...course.termInfo.keys()].some((term) => term < termId);
                break;
              case 'currently_enrolled':
                decision = decision && [...course.termInfo.keys()].some((term) => term === termId);
                break;
              case 'both':
                decision = decision && [...course.termInfo.keys()].some((term) => term <= termId);
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
            const biggestSem = semesters.reduceRight(
              (prev, curr) => (prev > curr ? prev : curr),
              '',
            );
            isEnroled = termName >= biggestSem;
          }
          decision = decision && isEnroled;
        }
      }
      return decision;
    }
    const conditionsMet: number = courseInfo.appliesTo.filter((req) =>
      singleRequirementStatus(req, courseInfo.conditionStatus),
    ).length;

    switch (courseInfo.conditionedOn) {
      case 'all':
        return conditionsMet === courseInfo.appliesTo.length;
      case 'any':
        return conditionsMet >= 1;
      case 'two':
        return conditionsMet >= 2;
      case 'three':
        return conditionsMet >= 3;
      case 'four':
        return conditionsMet >= 4;
      case 'not_all':
        return conditionsMet < courseInfo.appliesTo.length;
      case 'not_any':
        return conditionsMet === 0;
    }
  }
  const termName = allCourses.getTermsInfo({ termId })!.termName;
  let finalResult = true;
  if (courseInfo.prerequisites) {
    finalResult = finalResult && singleRequirementStatus(courseInfo.prerequisites, 'none');
  }
  if (courseInfo.antirequisites) {
    finalResult = finalResult && singleRequirementStatus(courseInfo.antirequisites, 'none');
  }
  if (courseInfo.corequisites) {
    finalResult = finalResult && singleRequirementStatus(courseInfo.corequisites, 'none');
  }
  return finalResult;
}

// This function generates connection lines between courses and their prerequisites.
// It takes a prerequisite graph and course locations as input and returns an array of line segments.
export function generateConnectionLines(
  courseReqGraph: [number, number][],
  allCourses: AllCourseInformation,
) {
  const res: LineType[] = [];
  for (const [preReqCourseId, courseId] of courseReqGraph) {
    const preReqLocations = allCourses.getAllCourseLocations(preReqCourseId); // Get locations of the prerequisite course.
    const courseLocations = allCourses.getAllCourseLocations(courseId); // Get locations of the current course.
    if (preReqLocations && courseLocations) {
      for (const [termId, { location: courseLoc }] of courseLocations.entries()) {
        if (!courseLoc) continue;
        // Find the rightmost prerequisite term that is earlier than the current term.
        const rightMostPreReqTermId = preReqLocations
          .keys()
          .reduce((best, cur) => (cur > best && termId > cur ? cur : best));
        if (rightMostPreReqTermId < termId) {
          const rightMostPreReq = preReqLocations.get(rightMostPreReqTermId)!.location;
          if (!rightMostPreReq) continue;
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
