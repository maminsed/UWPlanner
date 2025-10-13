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
