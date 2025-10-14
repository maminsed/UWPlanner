export type termIdInterface = {
    value: number,
    display: string,
}

export type Pair = {
    x: number;
    y: number;
}

export type Location = {
    left: number;
    top: number;
    width: number;
    height: number;
}

export type CourseInformation = {
    termName: string;
    courseName: string;
    termId: number;
    courseId: number;
}


export type gqlCourseSection = {
    id: number;
    code: string;
    prereqs: string;
    coreqs: string;
    antireqs:string;
    prerequisites: {
        prerequisite_id:number,
        is_corequisite:boolean
    }[]
}

export type ClassLocations = Map<number,Map<number,Location>>
