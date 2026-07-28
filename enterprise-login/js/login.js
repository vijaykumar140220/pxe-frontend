(function () {
  const form = document.getElementById("loginForm");
  const username = document.getElementById("username");
  const password = document.getElementById("password");
  const passwordToggle = document.getElementById("passwordToggle");
  const themeToggle = document.getElementById("themeToggle");
  const loginSpinner = document.getElementById("loginSpinner");
  const loginToast = document.getElementById("loginToast");
  const toastMessage = document.getElementById("toastMessage");
  const strengthBar = document.getElementById("strengthBar");
  const strengthLabel = document.getElementById("strengthLabel");
  const body = document.body;
  const toast = bootstrap.Toast.getOrCreateInstance(loginToast, {
    delay: 2600,
  });

  const setStrength = (value) => {
    const score = [
      value.length >= 8,
      /[A-Z]/.test(value),
      /[0-9]/.test(value),
      /[^A-Za-z0-9]/.test(value),
    ].filter(Boolean).length;

    strengthBar.className = "pxe-strength__bar";

    if (score <= 1) {
      strengthBar.classList.add("strength-0");
      strengthLabel.textContent = "Weak";
    } else if (score === 2) {
      strengthBar.classList.add("strength-1");
      strengthLabel.textContent = "Fair";
    } else if (score === 3) {
      strengthBar.classList.add("strength-2");
      strengthLabel.textContent = "Strong";
    } else {
      strengthBar.classList.add("strength-3");
      strengthLabel.textContent = "Very Strong";
    }
  };

  const showToast = (message) => {
    toastMessage.textContent = message;
    toast.show();
  };

  password.addEventListener("input", (event) => {
    setStrength(event.target.value);
    password.classList.remove("is-invalid");
  });

  passwordToggle.addEventListener("click", () => {
    const isHidden = password.type === "password";
    password.type = isHidden ? "text" : "password";
    passwordToggle.innerHTML = isHidden
      ? '<i class="bi bi-eye"></i>'
      : '<i class="bi bi-eye-slash"></i>';
  });

  themeToggle.addEventListener("click", () => {
    const isDark = body.classList.toggle("pxe-dark-mode");
    themeToggle.innerHTML = isDark
      ? '<i class="bi bi-sun me-1"></i>Light Mode'
      : '<i class="bi bi-moon-stars me-1"></i>Dark Mode';
    showToast(isDark ? "Dark mode enabled." : "Light mode enabled.");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const usernameValue = username.value.trim();
    const passwordValue = password.value.trim();
    const isValid = usernameValue.length > 0 && passwordValue.length >= 8;

    username.classList.toggle("is-invalid", !usernameValue);
    password.classList.toggle("is-invalid", passwordValue.length < 8);

    if (!isValid) {
      showToast("Please enter a valid username and password.");
      return;
    }

    loginSpinner.classList.remove("d-none");
    form.querySelector(".pxe-login-btn__text").textContent = "Signing in...";

    window.setTimeout(() => {
      loginSpinner.classList.add("d-none");
      form.querySelector(".pxe-login-btn__text").textContent = "Login";
      showToast("Login successful. Redirecting to dashboard...");
    }, 1400);
  });

  username.addEventListener("input", () => username.classList.remove("is-invalid"));
})();
