function entrar() {

    let email = document.querySelector("input[type='text']").value;
    let senha = document.querySelector("input[type='password']").value;

    if(email === "" || senha === "") {
        alert("Preencha todos os campos!");
    } else {
        window.location.href = "home.html";
    }

}


function sair() {
    window.location.href = "index.html";
}function cadastrar() {

    let nome = document.querySelectorAll("input")[0].value;
    let email = document.querySelectorAll("input")[1].value;
    let senha = document.querySelectorAll("input")[2].value;
    let confirmar = document.querySelectorAll("input")[3].value;


    if(nome === "" || email === "" || senha === "") {
        alert("Preencha todos os campos!");
        return;
    }


    if(senha !== confirmar) {
        alert("As senhas não são iguais!");
        return;
    }


    let usuario = {
        nome: nome,
        email: email,
        senha: senha
    };


    localStorage.setItem("usuario", JSON.stringify(usuario));


    alert("Conta criada com sucesso!");


    window.location.href = "index.html";

}