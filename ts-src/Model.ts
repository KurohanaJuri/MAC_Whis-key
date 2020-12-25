export type Whiskey = {
    _id: string;
    name:string;
    color: string;
    noses:string;
    bodies:string;
    palates:string;
    finishes:string;
    percent: number;
    region: string;
    district: string;
}

export type Color = {
    id: number;
    name: string;
}

export type Nose = {
    id: number;
    name: string;
}
export type Body = {
    id: number;
    name: string;
}
export type Palate = {
    id: number;
    name: string;
}
export type Finish = {
    id: number;
    name: string;
}

export type Liked = {
    at: Date;
    rank: number;
}

export const likedValues = [1, 2, 3, 4, 5];

export type User = {
    username?: string;
    last_name?: string;
    first_name?: string;
    id: number;
    is_bot: boolean;
    language_code?: string;
}
