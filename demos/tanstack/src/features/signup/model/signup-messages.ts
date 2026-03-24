export const signupMessages = {
  userId: {
    required: '아이디를 입력해 주세요.',
    invalidFormat: '영문, 숫자를 포함해 입력해주세요.',
    maxLength: '20자 이내로 입력해주세요.',
    defaultHelper: '영문, 숫자를 포함해 최대 20자 이내',
    available: '사용 가능한 아이디입니다.',
    duplicate: '이미 사용 중인 아이디입니다.',
  },
  password: {
    required: '비밀번호를 입력해 주세요.',
    invalidFormat: '대문자, 소문자, 숫자, 특수문자를 포함해 입력해 주세요.',
    maxLength: '20자 이내로 입력해주세요.',
    defaultHelper: '대문자, 소문자, 숫자, 특수문자를 포함해 최대 20자',
  },
  passwordConfirm: {
    required: '비밀번호와 동일하게 입력해 주세요.',
    defaultHelper: '비밀번호를 다시 입력하세요',
    matched: '비밀번호가 일치합니다.',
    mismatched: '비밀번호가 일치하지 않습니다.',
  },
  gender: { required: '성별을 선택해 주세요.' },
  mbti: {
    invalidFormat: '예: ENFP, ISTJ 형식으로 입력해 주세요.',
    defaultHelper: '예: ENFP, ISTJ 형식으로 입력해 주세요.',
  },
  submit: { success: '회원가입이 완료되었습니다.' },
} as const;
