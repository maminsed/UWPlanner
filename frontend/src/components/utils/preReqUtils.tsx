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
  courseId: number,
  allCourses: AllCourseInformation,
) {
  const termName = allCourses.getTermsInfo({ termId })!.termName;
  function singleRequirementStatus(
    courseInfo: Requirement,
    status: Requirement['conditionStatus'],
  ): boolean {
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
      courseInfo.met = decision;
      return decision;
    }
    const conditionsMet = courseInfo.appliesTo.filter((req) =>
      singleRequirementStatus(req, courseInfo.conditionStatus),
    ).length;

    let decision = false;
    switch (courseInfo.conditionedOn) {
      case 'all':
        decision = conditionsMet === courseInfo.appliesTo.length;
        break;
      case 'any':
        decision = conditionsMet >= 1;
        break;
      case 'two':
        decision = conditionsMet >= 2;
        break;
      case 'three':
        decision = conditionsMet >= 3;
        break;
      case 'four':
        decision = conditionsMet >= 4;
        break;
      case 'not_all':
        decision = conditionsMet < courseInfo.appliesTo.length;
        break;
      case 'not_any':
        decision = conditionsMet === 0;
        break;
    }
    courseInfo.met = decision;
    return decision;
  }

  let finalResult = true;
  if (courseInfo.prerequisites) {
    finalResult = finalResult && singleRequirementStatus(courseInfo.prerequisites, 'none');
  }
  if (courseInfo.antirequisites) {
    const decision = singleRequirementStatus(courseInfo.antirequisites, 'none');
    finalResult = finalResult && decision;
    // console.log(`debug: at antiReq for: ${allCourses.getCourseInfoId(courseId)?.code} with decision: ${decision}`)
  }
  if (courseInfo.corequisites) {
    finalResult = finalResult && singleRequirementStatus(courseInfo.corequisites, 'none');
  }
  const term = allCourses.getCourseInfoId(courseId)?.termInfo.get(termId);
  if (term) term.allReqsMet = finalResult;
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
