export type Whiskey = {
    _id: string;
    percent: number;
    region: string;
    district: string;
}

export type Nose = {
    _id: string;
    name: string;
}
export type Body = {
    _id: string;
    name: string;
}
export type Palate = {
    _id: string;
    name: string;
}
export type Finish = {
    _id: string;
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
