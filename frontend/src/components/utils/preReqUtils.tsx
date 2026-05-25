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
  allDegrees: { name: string; url: string }[],
): number[] {
  const termName = allCourses.getTermsInfo({ termId })!.termName;
  const dependentCourses: number[] = [];
  function singleRequirementStatus(
    courseInfo: Requirement,
    status: Requirement['conditionStatus'],
    isPrereq: boolean = false,
  ): boolean | undefined {
    if (courseInfo.conditionedOn == 'final' || courseInfo.conditionedOn == 'unclassified') {
      let decision: boolean | undefined = undefined;
      for (const link of courseInfo.relatedLinks) {
        // Checking courses
        if (link.linkType == 'courses' || link.linkType == 'course') {
          const course = allCourses.getCourseInfoCode(link.value.toLowerCase());
          if (course) {
            if (isPrereq) dependentCourses.push(course.id);
            let conditionMet = false;
            switch (status) {
              case 'none':
              case 'complete':
                conditionMet = [...course.termInfo.keys()].some((term) => term < termId);
                break;
              case 'currently_enrolled':
                conditionMet = [...course.termInfo.keys()].some((term) => term === termId);
                break;
              case 'both':
                conditionMet = [...course.termInfo.keys()].some((term) => term <= termId);
                break;
            }
            decision = decision === undefined ? conditionMet : decision && conditionMet;
          } else {
            decision = false;
          }
          // checking programs
        } else if (link.linkType == 'programs') {
          //TODO: complete this:
          // decision = decision && allDegrees.some((degree)=>{degree.url == link.url});
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
          decision = decision === undefined ? isEnroled : decision && isEnroled;
        }
      }
      courseInfo.met = decision;
      return decision;
    }
    const childResults = courseInfo.appliesTo.map((req) =>
      singleRequirementStatus(req, courseInfo.conditionStatus, isPrereq),
    );
    const trueCount = childResults.filter((r) => r === true).length;
    const undefCount = childResults.filter((r) => r === undefined).length;
    const falseCount = childResults.filter((r) => r === false).length;

    let decision: boolean | undefined = undefined;
    switch (courseInfo.conditionedOn) {
      case 'all':
        if (falseCount > 0) decision = false;
        else if (undefCount > 0) decision = undefined;
        else decision = true;
        break;
      case 'any':
        if (trueCount >= 1) decision = true;
        else if (undefCount > 0) decision = undefined;
        else decision = false;
        break;
      case 'two':
        if (trueCount >= 2) decision = true;
        else if (trueCount + undefCount >= 2) decision = undefined;
        else decision = false;
        break;
      case 'three':
        if (trueCount >= 3) decision = true;
        else if (trueCount + undefCount >= 3) decision = undefined;
        else decision = false;
        break;
      case 'four':
        if (trueCount >= 4) decision = true;
        else if (trueCount + undefCount >= 4) decision = undefined;
        else decision = false;
        break;
      case 'not_all':
        if (falseCount > 0) decision = true;
        else if (undefCount > 0) decision = undefined;
        else decision = false;
        break;
      case 'not_any':
        if (trueCount > 0) decision = false;
        else if (undefCount > 0) decision = undefined;
        else decision = true;
        break;
    }
    courseInfo.met = decision;
    return decision;
  }

  let finalResult: boolean | undefined = true;
  if (courseInfo.prerequisites) {
    const pDecision = singleRequirementStatus(courseInfo.prerequisites, 'none', true);
    finalResult = pDecision === false ? false : pDecision === undefined ? undefined : finalResult;
  }
  if (courseInfo.antirequisites) {
    const decision = singleRequirementStatus(courseInfo.antirequisites, 'none');
    finalResult =
      finalResult === false || decision === false
        ? false
        : finalResult === undefined || decision === undefined
          ? undefined
          : true;
    // console.log(`debug: at antiReq for: ${allCourses.getCourseInfoId(courseId)?.code} with decision: ${decision}`)
  }
  if (courseInfo.corequisites) {
    const cDecision = singleRequirementStatus(courseInfo.corequisites, 'none');
    finalResult =
      finalResult === false || cDecision === false
        ? false
        : finalResult === undefined || cDecision === undefined
          ? undefined
          : true;
  }
  const term = allCourses.getCourseInfoId(courseId)?.termInfo.get(termId);
  if (term) term.allReqsMet = finalResult;
  return dependentCourses;
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
