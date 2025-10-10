import bcrypt from "bcrypt";

const comparePasswords = (plainText: string, hash: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        bcrypt.compare(plainText, hash, (err: Error | undefined, isMatch: boolean) => {
            if (err) reject(err);
            resolve(isMatch);
        });
    });
};

export default comparePasswords