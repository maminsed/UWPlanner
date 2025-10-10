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
