export function termOperation(termId: number, distance: number) {
    let currTerm = 0;
    if (termId % 10 == 5) currTerm = 1;
    else if (termId % 10 == 9) currTerm = 2;

    let resTerm = (currTerm + distance) % 3;
    if (resTerm < 0) resTerm += 3;
    if (resTerm == 0) resTerm = 1;
    else if (resTerm == 1) resTerm = 5;
    else resTerm = 9;

    const yearDiff = Math.floor((currTerm + distance) / 3);
    return (Math.floor(termId / 10) + yearDiff) * 10 + resTerm;
}

export function getCurrentTermId() {
    const date = new Date();
    let term = 1;
    if (date.getMonth() >= 4 && date.getMonth() < 8) term = 5;
    else if (date.getMonth() >= 8) term = 9;
    return (date.getFullYear() - 1900) * 10 + term
}

export const termMap = {1:0,5:1,9:2};

export function getTermName(termId: number) {
    let res = ""
    if (termId % 10 == 5) {
        res += "Spring "
    } else if (termId % 10 == 9) {
        res += "Fall "
    } else {
        res += "Winter "
    }
    res += Math.floor(termId / 10) + 1900
    return res;
}

export function getTermDistance(termId1:number, termId2:number) {
    if (termId2 < termId1) return getTermDistance(termId2, termId1);
    const yearDiff = Math.floor(termId2 / 10) - Math.floor(termId1 / 10); 
    const monthDiff = termMap[termId2 % 10 as keyof typeof termMap] - termMap[termId1 % 10 as keyof typeof termMap];
    return yearDiff * 3 + monthDiff;
}
