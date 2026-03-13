export type DemoUser = {
  id: string;
  name: string;
};

export async function fetchUser(): Promise<DemoUser> {
  return Promise.resolve({
    id: '1',
    name: 'Jin',
  });
}
