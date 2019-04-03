var screenWidth = $("#canvas").width();
var screenHeight = $("#canvas").height();

var ctx;
var deltaTime = 1.0 / 60.0;

// variables para depuración
var fps = 0;
var frames = 0;
var time = 0;
var acumDelta = 0;
var totalTime = 0.0; // acumulador del tiempo jugado

var showDebug = false; // indica si se dibujarán datos de debug

// booleanos que indican si se ha presionado una tecla
var KeyLeftPreshed = false;
var KeyRightPreshed = false;
var KeyUpPreshed = false;
var KeyDownPreshed = false;
var SpacePreshed = false;
var LeftShipfPreshed = false;

// estado del juego
var gameState = 0; // 0: menú, 1: jugando, 2: GameOver
var menuState = 0; // 0: animación de inicio, 1: animacion créditos, 2: estático

// menús
var titleImg = { // imagen logotipo
    src: 'images/Title_logo.png',
    img: new Image(),
    X: 0,
    Y: 0,
    rotation: 0
}
var creditsImg = { // imagen créditos
    src: 'images/Title_credits.png',
    img: new Image(),
    X: 0,
    Y: 0,
    rotation: 0
}
var gameoverImg = { // imagen gameover
    src: 'images/game_over.png',
    img: new Image(),
    X: 0,
    Y: 120
}
var soundMuteImg = { // icono de sonido
    src: 'images/sound_mute.png',
    img: new Image(),
    X: screenWidth - 40,
    Y: screenHeight - 40,
    icon: 0, // 0: sound ON, 1: sound OFF
    Draw: function ()
    {
        if (this.icon == 0)
            ctx.drawImage(this.img, 0, 0, 32, 32, this.X, this.Y, 32, 32);
        else
            ctx.drawImage(this.img, 32, 0, 32, 32, this.X, this.Y, 32, 32);
    }
}

// puntuación actual
var actualScore = 0;
// máxima puntuación obtenida
var maxScore = 0;
// flag que indica que en la última partida se superó el record
var newRecord = false;

var gravityValue = 0.15;   // fuerza de la gravedad
var gravityAc = 1.8;       // aceleración de la gravedad
var scrollVelocity = 5.0;  // velocidad del scroll
var initialPlayerX = 20;   // posición horizontal del jugador
var initialPlayerY = screenHeight / 2; // posición vertical inicial del jugador
var timeSinceLastJump = 0; // tiempo transcurrido desde el último salto

var tubeGap = 100;     // pixeles del hueco entre tubos
var tubeGapYMin = 100; // posición inferior mínima del hueco entre tubos
var tubeGapYMax = screenHeight - tubeGapYMin; // posición superior máxima del hueco
var tubeGapDif = tubeGapYMax - tubeGapYMin; // margen en el que puede situarse el próximo hueco

// tiempo (en segundos), mínimo que tardará un nuevo par de tubos en aparecer
var tubeSpawnMin = 0.5;
// tiempo (en segundos), máximo que tardará un nuevo par de tubos en aparecer
var tubeSpawnMax = 1.25;
var tubeSpawnDif = tubeSpawnMax - tubeSpawnMin;
var nextTubeSpawn = 0.0; // tiempo que tardará en aparecer un nuevo par de tubos

var audioActive = true; // indica si el audio esta activo o no
var audioJump; // sonido de salto
var audioDead; // sonido de muerte

var player = { // objeto que representa al jugador
    jumpVelocityPower: 10.0,
    jumpVelocity: 10.0, // velocidad del salto
    jumpPunch: 2.5 * gravityValue * gravityAc, // fuerza del salto
    X: initialPlayerX,
    Y: initialPlayerY,
    colliderW: 16,
    colliderH: 16,
    fallVelocity: 0.0, // velocidad de caida
    img: new Image(),
    imgSrc: 'images/player_sprites.png',
    state: 0, // 0=falling, 1=jumping, 2=dying
    animationFrames: 10, // número de frames de la animacion
    animationN: 0,       // sprite de la animación actual
    animationT1: 0.02,   // tiempo que dura un frame de la animacion 1
    animationT2: 0.1,    // tiempo que dura un frame de la animacion 2
    currentAnimT: 0.0,   // tiempo del frame actual
    currentAnimId: 0,    // animación seleccionada (fila del sprite)
    Reset: function ()
    {
        this.Y = initialPlayerY;
        this.fallVelocity = 0.0;
        this.jumpVelocity = this.jumpVelocityPower;
        this.state = 0;
        this.currentAnimId = 0;
        this.currentAnimT = this.animationT1;
    },
    Jump: function ()
    {
        this.jumpVelocity = this.jumpVelocityPower;
        this.state = 1;
    },
    Die: function ()
    {
        this.state = 2;
        this.currentAnimId = 1;
        this.animationN = 0;
    },
    Update: function ()
    {
        switch (this.state)
        {
        case 0: // falling
            this.fallVelocity += gravityValue * gravityAc;
            this.Y += this.fallVelocity;
        
            if (this.Y >= screenHeight)
                this.Reset();
                
            break;
        
        case 1: // jumping
            this.jumpVelocity -= this.jumpPunch;
            this.Y -= this.jumpVelocity;
            
            if (this.Y <= 0)
                Reset();
                
            if (this.jumpVelocity <= 0.0)
            {
                this.jumpVelocity = 10.0;
                this.fallVelocity = 0.0;
                this.state = 0; // falling
            }
        
            break;
            
        case 2: // dying
            this.fallVelocity += gravityValue * gravityAc * 0.15;
            this.Y += this.fallVelocity;
        
            if (this.Y >= screenHeight)
                GameOver();
                
            break;
         }
        
        this.currentAnimT -= deltaTime;
        if (this.currentAnimT <= 0.0) // actualizar frame de la animación
        {
            // actualizar frame de la animación
            this.animationN = (this.animationN + 1) % this.animationFrames;
            if (this.state == 2)
                this.currentAnimT = this.animationT2;
            else
                this.currentAnimT = this.animationT1;
        }
    },
    Draw: function ()
    {
        ctx.drawImage(this.img, this.animationN * 24, this.currentAnimId * 24,
            24, 24, this.X, this.Y, 24, 24);
    }
}

// imágenes de los tubos
var tubeImg1Src = 'images/tube1.png'; // sprite de la parte de arriba del tubo
var tubeImg1 = new Image();
var tubeImg2Src = 'images/tube2.png'; // sprite de la parte de abajo del tubo
var tubeImg2 = new Image();
var tubeImg3Src = 'images/tube3.png'; // sprite de la parte central del tubo
var tubeImg3 = new Image();

var tubes = new Array();

// colores del fondo
var bgColor1 = { R: 128, G: 0, B: 255 };
var bgColor2 = { R: 0, G: 255, B: 255 };
var bgColor3 = { R: 255, G: 196, B: 0 };
var bgColorVar = 0.0; // mezcla del fondo en el paso correspondiente
var bgColorStep = 0; // paso de mezcla, 0: 1-2, 1: 2-3, 2: 3-0
var bgColorVarVelocity = 0.001; // velocidad de la variación de color del fondo

function Init ()
{
    window.requestAnimationFrame = (function (evt) {
        return window.requestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 17);
            };
    }) ();
    var canvas = document.getElementById('canvas');
    
    // ejemplos canvas: http://www.w3schools.com/tags/ref_canvas.asp
    
    if (canvas.getContext)
    {
        ctx = canvas.getContext('2d');
        
        LoadResources();
    }
    
    document.addEventListener('keydown', OnKeyDown, false);
    document.addEventListener('keyup', OnKeyUp, false);
    document.addEventListener('mousedown', OnMouseDown, false);
}

function LoadResources ()
{
    soundMuteImg.img.src = soundMuteImg.src;
    gameoverImg.img.src = gameoverImg.src;
    titleImg.img.src = titleImg.src;
    titleImg.img.onload = function ()
    {
        // se coloca encima del canvas para preparar la animación de entrada
        titleImg.Y = -titleImg.img.height;
        
        // se inicia la imagen de créditos
        creditsImg.img.src = creditsImg.src;
        creditsImg.img.onload = function ()
        {
            creditsImg.Y = -creditsImg.img.height;
            creditsImg.X = screenWidth / 2 - creditsImg.img.width / 2;
        }
        
        // se coloca la imagen de game over
        gameoverImg.X = screenWidth / 2 - gameoverImg.img.width / 2;
        
        tubeImg1.src = tubeImg1Src;
        tubeImg2.src = tubeImg2Src;
        tubeImg3.src = tubeImg3Src;
        tubeImg1.onload = function ()
        {
            player.img.src = player.imgSrc;
            player.img.onload = function ()
            {
                //setInterval( function(){ Update(); Draw();}, deltaTime*1000 /*60fps*/);
                requestAnimationFrame(Loop);
            }
        }
    }
    
    // audio resources
    audioJump = document.getElementById('Jump');
    audioDead = document.getElementById('Dead');
}

function Loop ()
{
    requestAnimationFrame(Loop);
    Update();
    Draw();
}

function Update ()
{
    var now = Date.now();
    var timeAux = now - time;
    if (timeAux >= 1000)
        timeAux = 0;
    time = now;
    frames++;
    acumDelta += timeAux;
    if (acumDelta >= 1000)
    {
        fps = frames;
        frames = 0;
        acumDelta -= 1000;
    }
    //deltaTime = timeAux / 1000;
    totalTime += deltaTime;

    switch (gameState)
    {
    case 0: // menú
        if (menuState == 0) // intro
        {
            titleImg.Y += 2;
            if (titleImg.Y >= 80)
                menuState = 1;
        }
        else if (menuState == 1)
        {
            titleImg.rotation += Math.cos(totalTime) * 0.002 + 0.00015;
            
            creditsImg.Y += 1;
            if (creditsImg.Y >= 240)
                menuState = 2;
        }
        else if (menuState == 2)
        {
            titleImg.rotation += Math.cos(totalTime) * 0.002 + 0.00015;
        }
        break;
        
    case 1: // juego
        nextTubeSpawn -= deltaTime;
        if (nextTubeSpawn <= 0)
        {
            // calculate the Y spawn point
            var randomGap = Math.random() * tubeGapDif;
            var gapY = tubeGapYMin + randomGap;
            var tube1Y = gapY + tubeGap / 2;
            var tube2Y = gapY - tubeGap / 2 - tubeImg2.height;
            
            // spawn a new tube
            var tube = {
                X: screenWidth,
                Y: gapY,
                gap: tubeGap,
                t1Y: tube1Y,
                t2Y: tube2Y,
                img1: tubeImg1,
                img2: tubeImg2,
                img3: tubeImg3,
                Update: function ()
                {
                    this.X -= scrollVelocity;
                },
                Draw: function ()
                {
                    ctx.drawImage(this.img1, this.X, this.t1Y);
                    ctx.drawImage(this.img3, this.X, this.t1Y + 32, 32, 300);
                    ctx.drawImage(this.img2, this.X, this.t2Y);
                    ctx.drawImage(this.img3, this.X, this.t2Y, 32, -300);
                }
            }
            tubes[tubes.length] = tube;
            
            // calculate the new nextTubeSpawn value
            var randomSpawn = Math.random() * tubeSpawnDif;
            nextTubeSpawn = tubeSpawnMin + randomSpawn;
        }
        
        // player update
        player.Update();
        
        // tubes update
        for (i=0; i<tubes.length; i++)
            tubes[i].Update();
        
        if (tubes.length > 0)
        {
            var tubeWidth = tubes[0].img1.width;
            // check if the player is colliding with the older tube
            if ( (player.X + player.colliderW >= tubes[0].X) &&
                 (player.X <= tubes[0].X + tubeWidth) &&
                 !((player.Y + 8 > tubes[0].t2Y + tubeWidth) &&
                   (player.Y + player.colliderH < tubes[0].t1Y)) )
                if (player.state != 2)
                    PlayerDead();
                
            // check if the older tube is outside the screen
            if (tubes[0].X <= -tubeWidth)
            {
                if (player.state != 2)
                    actualScore++;
                tubes.shift();
            }
        }
        break;
    
    case 2: // menú GameOver
    
        break;
    }
    
    // variación del patron de color del fondo
    bgColorVar += bgColorVarVelocity;
    if (bgColorVar > 1.0)
    {
        bgColorStep = (bgColorStep + 1) % 3;
        bgColorVar = 0.0;
    }
    
} // Update ()

function Draw ()
{
    // rectángulo negro
    ctx.strokeRect(0, 0, screenWidth, screenHeight);
    
    // fondo
    DrawBg();
    
    switch (gameState)
    {
    case 0: // menú
        if (menuState == 0)
            ctx.drawImage(titleImg.img, titleImg.X, titleImg.Y);
        else if (menuState == 1)
        {
            // rotación de la imagen de título
            ctx.save();
            ctx.translate(titleImg.X + titleImg.img.width / 2, titleImg.Y + titleImg.img.height / 2);
            ctx.rotate(titleImg.rotation);
            ctx.drawImage(titleImg.img, -titleImg.img.width / 2, -titleImg.img.height / 2);
            ctx.restore();
            
            // imagen de créditos
            ctx.drawImage(creditsImg.img, creditsImg.X, creditsImg.Y);
        }
        else if (menuState == 2)
        {
            // rotación de la imagen de título
            ctx.save();
            ctx.translate(titleImg.X + titleImg.img.width / 2, titleImg.Y + titleImg.img.height / 2);
            ctx.rotate(titleImg.rotation);
            ctx.drawImage(titleImg.img, -titleImg.img.width / 2, -titleImg.img.height / 2);
            ctx.restore();
            
            // imagen de créditos
            ctx.drawImage(creditsImg.img, creditsImg.X, creditsImg.Y);
        }
        break;
    
    case 1: // juego
        // tubos
        for (i=0; i<tubes.length; i++)
            tubes[i].Draw();
        // jugador
        player.Draw();
        
        // score:
        ctx.font = "18px Arial";
        ctx.fillStyle = 'white';
        ctx.fillText("Score: " + actualScore, screenWidth-90, 16);
        
        break;
    
    case 2: // menú GameOver
        ctx.drawImage(gameoverImg.img, gameoverImg.X, gameoverImg.Y);
        if (newRecord)
        {
            ctx.font = "24px Arial";
            ctx.fillStyle = 'white';
            ctx.fillText("New Record!!! " + actualScore, 70, 260);
        }
        break;
    }
    
    soundMuteImg.Draw();
    
    if (showDebug)
    {
        ctx.font="10px Arial";
        ctx.fillStyle = 'white';
        
        // fps:
        ctx.fillText("FPS=" + fps, 10, 12);
        ctx.fillText("frames=" + frames, 10, 24);
        
        // gameplay variables:
        ctx.fillText("gravityValue=" + gravityValue, 10, 36);
        ctx.fillText("gravityAc=" + gravityAc, 10, 48);
        ctx.fillText("scrollVelocity=" + scrollVelocity, 10, 60);
        ctx.fillText("tubeGap=" + tubeGap, 10, 72);
        ctx.fillText("tubeGapYMin=" + tubeGapYMin, 10, 84);
        ctx.fillText("tubeSpawnMin=" + tubeSpawnMin, 10, 96);
        ctx.fillText("tubeSpawnMax=" + tubeSpawnMax, 10, 108);
        ctx.fillText("jumpVelocity=" + player.jumpVelocityPower, 10, 120);
    }
} // Draw ()

function DrawBg ()
{
    // cálculo del color actual del fondo
    var bgColorR, bgColorG, bgColorB;
    switch (bgColorStep)
    {
        case 0:
            bgColorR = Math.round( (1 - bgColorVar) * bgColor1.R + (bgColorVar) * bgColor2.R );
            bgColorG = Math.round( (1 - bgColorVar) * bgColor1.G + (bgColorVar) * bgColor2.G );
            bgColorB = Math.round( (1 - bgColorVar) * bgColor1.B + (bgColorVar) * bgColor2.B );
            break;
        case 1:
            bgColorR = Math.round( (1 - bgColorVar) * bgColor2.R + (bgColorVar) * bgColor3.R );
            bgColorG = Math.round( (1 - bgColorVar) * bgColor2.G + (bgColorVar) * bgColor3.G );
            bgColorB = Math.round( (1 - bgColorVar) * bgColor2.B + (bgColorVar) * bgColor3.B );
            break;
        case 2:
            bgColorR = Math.round( (1 - bgColorVar) * bgColor3.R + (bgColorVar) * bgColor1.R );
            bgColorG = Math.round( (1 - bgColorVar) * bgColor3.G + (bgColorVar) * bgColor1.G );
            bgColorB = Math.round( (1 - bgColorVar) * bgColor3.B + (bgColorVar) * bgColor1.B );
            break;
    }
    var stringR = (bgColorR).toString(16); if (stringR.length < 2) stringR = "0" + stringR;
    var stringG = (bgColorG).toString(16); if (stringG.length < 2) stringG = "0" + stringG;
    var stringB = (bgColorB).toString(16); if (stringB.length < 2) stringB = "0" + stringB;
    var bgColor = "#" + stringR + stringG + stringB;
    var lGrad = ctx.createLinearGradient(320, 0, 320, screenWidth); // dirección del gradiente
    lGrad.addColorStop(0.0, '#040311');
    lGrad.addColorStop(0.05, "black");
    lGrad.addColorStop(1.0, bgColor);
    ctx.fillStyle = lGrad;
    ctx.fillRect(0, 0, screenWidth, screenHeight);
}

function PlayerDead ()
{
    // reproducir sonido de muerte
    if (audioActive)
        audioDead.play();
        
    // cambiar la animación y el estado del jugador
    player.Die();
}

function Reset ()
{
    // reiniciar array de tubos, puntuación y jugador
    tubes = new Array();
    actualScore = 0;
    player.Reset();
}

function GameOver ()
{
    if (actualScore > maxScore)
    {
        maxScore = actualScore;
        newRecord = true;
    }
    else
        newRecord = false;
        
    gameState = 2;
}

function OnKeyDown (e)
{
    //http://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
    switch (e.keyCode)
    {
        case 37: KeyLeftPreshed = true;   break;
        case 39: KeyRightPreshed = true;  break;
        case 38: KeyUpPreshed = true;     break;
        case 40: KeyDownPreshed = true;   break;
        case 32: SpacePreshed = true;     break; // espacio
        case 16: LeftShipfPreshed = true; break; // left shift
    }
}

function OnKeyUp (e)
{
    switch (e.keyCode)
    {
        case 16: LeftShipfPreshed = false; break; // left shift
        case 37: KeyLeftPreshed = false;  break;
        case 39: KeyRightPreshed = false; break;
        case 38: KeyUpPreshed = false;    break;
        case 40: KeyDownPreshed = false;  break;
        case 32: SpacePreshed = false;    break; // espacio
        case 68: showDebug = !showDebug;  break; // D
        case 77:
                if (audioActive)
                    soundMuteImg.icon = 1;
                else
                    soundMuteImg.icon = 0;
                audioActive = !audioActive;
                break; // M
    }
    
    if (showDebug)
    {
        switch (e.keyCode)
        {
            case 49: // 1
                if (LeftShipfPreshed)
                    gravityValue -= 0.01;
                else
                    gravityValue += 0.01;
                break;
            case 49: // 1
                if (LeftShipfPreshed)
                    gravityValue -= 0.01;
                else
                    gravityValue += 0.01;
                break;
            case 49: // 1
                if (LeftShipfPreshed)
                    gravityValue -= 0.01;
                else
                    gravityValue += 0.01;
                break;
            case 50: // 2
                if (LeftShipfPreshed)
                    gravityAc -= 0.1;
                else
                    gravityAc += 0.1;
                break;
            case 51: // 3
                if (LeftShipfPreshed)
                    scrollVelocity -= 1;
                else
                    scrollVelocity += 1;
                break;
            case 52: // 4
                if (LeftShipfPreshed)
                    tubeGap -= 5;
                else
                    tubeGap += 5;
                break;
            case 53: // 5
                if (LeftShipfPreshed)
                    tubeGapYMin -= 5;
                else
                    tubeGapYMin += 5;
                break;
            case 54: // 6
                if (LeftShipfPreshed)
                    tubeSpawnMin -= 0.05;
                else
                    tubeSpawnMin += 0.05;
                break;
            case 55: // 7
                if (LeftShipfPreshed)
                    tubeSpawnMax -= 0.05;
                else
                    tubeSpawnMax += 0.05;
                break;
            case 56: // 8
                if (LeftShipfPreshed)
                    player.jumpVelocityPower -= 1;
                else
                    player.jumpVelocityPower += 1;
                break;
        }
    }
}

function OnMouseDown (e)
{
    // mute button TODO!
    if (e.x >= soundMuteImg.X && e.x <= soundMuteImg.X + 32 &&
        e.y >= soundMuteImg.Y && e.y <= soundMuteImg.Y + 32)
    {
        if (audioActive)
            soundMuteImg.icon = 1;
        else
            soundMuteImg.icon = 0;
        audioActive = !audioActive;
    }
    
    switch (gameState)
    {
    case 0: // menu
        gameState = 1;
        break;
        
    case 1: // jugando
        if (player.state != 2)
        {
            // JUMP!
            player.Jump();
            
            // se reproduce el sonido del salto
            audioJump.pause();
            audioJump.currentTime = 0;
            if (audioActive)
                audioJump.play();
        }
        break;
    
    case 2: // gameover
        gameState = 1;
        Reset();
        break;
    }

}
